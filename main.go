package main

import (
	"bytes"
	"encoding/json"
	"errors"
	"fmt"
	"io/ioutil"
	"log"
	"net/http"
	"os"
	"sort"
	"text/template"

	"github.com/gorilla/websocket"
)

const portNumber = ":8080"
const scoreboardFile = "./static/data/scoreboard.json"

var wsChan = make(chan WsPayload)
var clients = make(map[WebSocketConnection]string)

type Score struct {
	Name  string `json:"name"`
	Score int    `json:"score"`
	Time  int    `json:"time"`
}

type WebSocketConnection struct {
	*websocket.Conn
}

// WsJsonResponse defines the response sent back from the websocket
type WsJsonResponse struct {
	Action     string  `json:"action"`
	Players    int     `json:"players"`
	Message    string  `json:"message"`
	Scoreboard []Score `json:"scoreboard"`
}

type WsPayload struct {
	Action  string              `json:"action"`
	Players int                 `json:"players"`
	Score   Score               `json:"score"`
	Conn    WebSocketConnection `json:"-"`
}

func main() {
	fmt.Printf("Starting application on http://localhost%s\n", portNumber)
	mux := http.NewServeMux()

	fileServer := http.FileServer(http.Dir("./static/"))
	mux.Handle("/static/", http.StripPrefix("/static", fileServer))

	mux.HandleFunc("/", Home)
	mux.HandleFunc("/ws", WsEndpoint)
	mux.HandleFunc("/scoreboard", Scoreboard)

	go ListenToWsChannel()

	log.Fatal(http.ListenAndServe(portNumber, mux))
}

var upgradeConnection = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin:     func(r *http.Request) bool { return true },
}

func Home(w http.ResponseWriter, req *http.Request) {
	err := renderTemplate(w, req, "index.html")
	if err != nil {
		http.Error(w, http.StatusText(http.StatusInternalServerError), http.StatusInternalServerError)
		return
	}
}

// WsEndpoint upgrades connection to websocket
func WsEndpoint(w http.ResponseWriter, req *http.Request) {
	ws, err := upgradeConnection.Upgrade(w, req, nil)
	if err != nil {
		fmt.Println("first error: ", err)
		log.Println(err)

	}

	conn := WebSocketConnection{Conn: ws}
	clients[conn] = ""

	var response WsJsonResponse
	scoreboard, err := getScores()
	if err != nil {
		fmt.Println(err)
	}
	response.Action = "update_scoreboard"
	response.Scoreboard = scoreboard

	err = ws.WriteJSON(response)
	if err != nil {
		log.Println(err)
	}

	go ListenForWs(&conn)
}

func ListenForWs(conn *WebSocketConnection) {
	defer func() {
		if r := recover(); r != nil {
			log.Println("Error", fmt.Sprintf("%v", r))
		}
	}()

	var payload WsPayload
	for {
		err := conn.ReadJSON(&payload)
		if err != nil {
			//do nothing
		} else {
			payload.Conn = *conn
			wsChan <- payload
		}
	}
}

func ListenToWsChannel() {
	var response WsJsonResponse

	for {
		event := <-wsChan
		switch event.Action {
		case "player_disconnected":
			delete(clients, event.Conn)
			response.Action = "player_count"
			response.Players = len(clients)
			broadcastToAll(response)
		case "player_connected":
			scoreboard, err := getScores()
			if err != nil {
				fmt.Println(err)
			}
			response.Action = "player_count"
			response.Players = len(clients)
			response.Scoreboard = scoreboard
			broadcastToAll(response)
		case "insert_score":
			player := Score{
				Name:  event.Score.Name,
				Score: event.Score.Score,
				Time:  event.Score.Time,
			}
			err := insertScore(player)
			if err != nil {
				fmt.Println(err)
			}
			scoreboard, err := getScores()
			if err != nil {
				fmt.Println(err)
			}
			response.Action = "update_scoreboard"
			response.Scoreboard = scoreboard
			broadcastToAll(response)
		}
	}
}

func broadcastToAll(response WsJsonResponse) {
	for client := range clients {
		err := client.WriteJSON(response)
		if err != nil {
			log.Println("websocket error")
			_ = client.Close()
			delete(clients, client)
		}
	}
}

func insertScore(score Score) error {
	jsonData, err := json.Marshal(score)
	if err != nil {
		return err
	}

	// Create a HTTP post request
	req, err := http.NewRequest("POST", "http://localhost:8080/scoreboard", bytes.NewBuffer(jsonData))
	if err != nil {
		return err
	}

	req.Header.Add("Content-Type", "application/json")
	client := &http.Client{}
	res, err := client.Do(req)
	if err != nil {
		return err
	}

	defer res.Body.Close()
	// Print the response status code and body
	if res.StatusCode != 201 {
		return errors.New(http.StatusText(res.StatusCode))
	}
	return nil
}

func getScores() ([]Score, error) {
	var scoreboard []Score
	// Create a HTTP post request
	resp, err := http.Get("http://localhost:8080/scoreboard")
	if err != nil {
		return scoreboard, err
	}

	defer resp.Body.Close()

	if err := json.NewDecoder(resp.Body).Decode(&scoreboard); err != nil {
		panic(err)
	}

	return scoreboard, nil
}

func Scoreboard(w http.ResponseWriter, req *http.Request) {
	switch req.Method {
	case "GET":
		scores, err := readScoreboard()
		if err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}
		var scoreboard []map[string]interface{}
		for _, player := range scores {
			score := map[string]interface{}{
				"name":  player.Name,
				"score": player.Score,
				"time":  player.Time,
			}

			scoreboard = append(scoreboard, score)
		}

		jsonData, err := json.Marshal(scoreboard)
		if err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}

		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(200)
		w.Write(jsonData)
	case "POST":
		decoder := json.NewDecoder(req.Body)
		var player Score
		err := decoder.Decode(&player)
		if err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}
		players, err := readScoreboard()
		if err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}
		players = append(players, player)
		sortScoreboard(players)
		err = writeScoreboard(players)
		if err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}
		w.WriteHeader(201)
	default:
		{
			http.Error(w, http.StatusText(http.StatusInternalServerError), http.StatusInternalServerError)
			return
		}
	}
}

func sortScoreboard(players []Score) {
	sort.Slice(players, func(i, j int) bool {
		if players[i].Score == players[j].Score {
			return players[i].Time < players[j].Time
		}
		return players[i].Score > players[j].Score
	})
}

func readScoreboard() ([]Score, error) {
	var players []Score
	file, err := os.Open(scoreboardFile)
	if err != nil {
		return players, err
	}
	defer file.Close()

	jsonBytes, err := ioutil.ReadAll(file)
	if err != nil {
		return players, err
	}

	err = json.Unmarshal(jsonBytes, &players)
	if err != nil {
		return players, err
	}
	return players, nil
}

func writeScoreboard(scores []Score) error {
	file, err := os.Create(scoreboardFile)
	if err != nil {
		return err
	}
	defer file.Close()

	jsonBytes, err := json.Marshal(scores)
	if err != nil {
		return err
	}

	_, err = file.Write(jsonBytes)
	if err != nil {
		return err
	}
	return nil
}

func renderTemplate(w http.ResponseWriter, req *http.Request, templateName string) error {
	parsedTemplate, err := template.ParseFiles(templateName)
	if err != nil {
		return err
	}
	err = parsedTemplate.Execute(w, nil)
	if err != nil {
		return err
	}
	return nil
}

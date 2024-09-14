import Ball from './Ball.js'
import Brick from './Brick.js'
import Paddle from './Paddle.js'
import GameArea from './GameArea.js'
import { maps } from './Maps.js'
import { brickTypes } from './BrickTypes.js'
import { powerUpSound } from './Ball.js'

const BRICK_WIDTH = 40
const BRICK_HEIGHT = 20
const WIDTH = 13 * BRICK_WIDTH
const HEIGHT = 30 * BRICK_HEIGHT
let PADDLE_WIDTH = 100
const PADDLE_HEIGHT = 10
const PADDLE_MARGIN_BOTTOM = BRICK_HEIGHT + 5
const PADDLE_SPEED = 10
const PADDLE_X = (WIDTH / 2) - (PADDLE_WIDTH / 2)
const PADDLE_Y = HEIGHT - PADDLE_MARGIN_BOTTOM - PADDLE_HEIGHT
const BALL_SIZE = 12
const BALL_X = WIDTH / 2
const BALL_Y = HEIGHT - PADDLE_HEIGHT - PADDLE_MARGIN_BOTTOM
const PLAYER_LIVES = 5
const PADDLE_EXTEND = 16
const EXTEND_OFFSET = PADDLE_EXTEND / 2
let MAP_INDEX = 0
const MUSIC = new Audio('/static/audio/soundtrack/background.mp3')
MUSIC.volume = 0.3
MUSIC.loop = true

const ball = new Ball(document.getElementById('ball'), BALL_SIZE, BALL_X, BALL_Y)
const paddle = new Paddle(document.getElementById('paddle'), PADDLE_WIDTH, PADDLE_HEIGHT, PADDLE_X, PADDLE_Y)
const gameArea = new GameArea(document.getElementById('game-area'), WIDTH, HEIGHT)
const startBtn = document.getElementById('start-btn')
const musicBtn = document.getElementById('music-btn')
const sfxBtn = document.getElementById('sfx-btn')
const fps = document.getElementById('fps')
const numPlayers = document.getElementById('numPlayers')
const timer = document.getElementById('timer')
const lives = document.getElementById('lives')
const pauseScreen = document.getElementById('pause-screen')
const userinfo = document.getElementById('userinfo')
const submitBtn = document.getElementById('userinfoBtn')
const story = document.getElementById('story')
const stroyText = [
    "One day, a new challenge arises. A wall of bricks appears before you, taller and wider than any you've seen before. Your heart races as you realize that this is your chance to prove your worth as a brick-breaker. You take a deep breath, grip your paddle tightly, and prepare to face the challenge head-on.",
    "The ball bounces off your paddle, and you watch as it hurtles towards the wall of bricks. You feel a surge of excitement as you hear the satisfying sound of bricks shattering one by one. You move your paddle with lightning-fast reflexes, angling it just right to hit each brick at the perfect spot. The battle is intense, and your concentration never wavers.",
    "After what feels like an eternity, you finally break the last brick in the wall. You let out a triumphant yell, your heart swelling with pride. You've done it - you've proven that you're the best brick-breaker in Ankaroid. You revel in the feeling of victory, knowing that you've achieved something truly remarkable."
]


let player_lives = PLAYER_LIVES
let leftArrow = false
let rightArrow = false
let start = false
let pause = false
let win = false
let music = true
export let sfx = true
let score = 0
let startTime = 0
let elapsedTime = 0
let pauseTime = 0
let timerInterval
let lastTime
let bricks
let newLevel = false
let firstLevel = true

export function updateScore(value) {
    score += value
    document.getElementById('score').innerText = score
}

//start game 
startBtn.addEventListener('click', () => {
    if (firstLevel) {
        setupGame(MAP_INDEX, true)
    } else {
        setupGame(MAP_INDEX, false)
    }
    story.innerHTML = `<p>` + stroyText[MAP_INDEX] + `<p>`
    story.style.display = 'none'
})

musicBtn.addEventListener('click', () => {
    music = !music
    if (music) {
        MUSIC.play()
        musicBtn.innerText = 'Music ON'
    } else {
        MUSIC.pause()
        musicBtn.innerText = 'Music OFF'
    }
})

sfxBtn.addEventListener('click', () => {
    sfx = !sfx
    if (sfx) {
        sfxBtn.innerText = 'SFX ON'
    } else {
        sfxBtn.innerText = 'SFX OFF'
    }
})

function handleKeydown(event) {
    if (event.key === 'ArrowLeft') {
        leftArrow = true
    } else if (event.key === 'ArrowRight') {
        rightArrow = true
    }
}

function handleKeyup(event) {
    if (event.key === 'ArrowLeft') {
        leftArrow = false
    } else if (event.key === 'ArrowRight') {
        rightArrow = false
    }
}

function displayStory() {
    story.style.display = 'block'
    start = false
    document.getElementById('paddle').style.zIndex = '-1'
    document.getElementById('ball').style.zIndex = '-1'
    document.getElementById('bricks').style.zIndex = '-1'

    document.removeEventListener("keydown", handleKeydown)
    document.removeEventListener("keyup", handleKeyup)
    document.removeEventListener("keypress", startGame)
    document.removeEventListener("keypress", pauseGame)
    document.querySelectorAll('#powerUp').forEach(powerUp => {
        powerUp.remove()
    })
    pauseTime = elapsedTime
    pauseTimer()
    newLevel = true
    startBtn.innerHTML = 'Next level'
    startBtn.style.display = 'block'
}

function gameOver() {
    start = false
    document.getElementById('paddle').style.zIndex = '-1'
    document.getElementById('ball').style.zIndex = '-1'
    document.getElementById('bricks').style.zIndex = '-1'

    document.removeEventListener("keydown", handleKeydown)
    document.removeEventListener("keyup", handleKeyup)
    document.removeEventListener("keypress", startGame)
    document.removeEventListener("keypress", pauseGame)
    document.querySelectorAll('#powerUp').forEach(powerUp => {
        powerUp.remove()
    })
    if (win) {
        document.getElementById('game-over').innerHTML = 'You Win'

    }
    document.getElementById('game-over').style.display = 'block'
    startBtn.innerHTML = 'Restart game'
    startBtn.style.display = 'block'
    pauseScreen.style.display = 'none'
    pauseTimer()
    PADDLE_WIDTH = 100
    if (score > 0) {
        submitBtn.addEventListener("click", insertScore)
        userinfo.style.display = 'block'
    }
}

function setupGame(MAP_INDEX = 0, restart = false) {
    pause = false
    win = false
    rightArrow = false
    leftArrow = false
    start = false
    document.getElementById('game-over').innerHTML = 'Game Over'
    document.addEventListener("keydown", handleKeydown)
    document.addEventListener("keyup", handleKeyup)
    document.addEventListener("keypress", startGame)
    document.addEventListener("keypress", pauseGame)
    submitBtn.removeEventListener("click", insertScore)
    document.getElementById('paddle').style.zIndex = '0'
    document.getElementById('ball').style.zIndex = '0'
    document.getElementById('bricks').style.zIndex = '0'
    document.getElementById('game-over').style.display = 'none'
    userinfo.style.display = 'none'
    startBtn.style.display = 'none'
    if (restart) {
        score = 0
        document.getElementById('score').innerHTML = 0
        player_lives = PLAYER_LIVES
        resetTimer()
    }
    bricks = drawBricks(maps[MAP_INDEX])
    lives.innerHTML = 'Lives:' + player_lives
    ball.reset(BALL_X, BALL_Y)
    paddle.reset(PADDLE_X, PADDLE_Y, PADDLE_WIDTH, PADDLE_HEIGHT)
    if (music) {
        MUSIC.play()
    }
    let powerUps = document.querySelectorAll('#powerUp')
    removePowerUp(powerUps)
}

const drawBricks = (map) => {
    let bricks = []
    let index = 0
    let bricksArea = document.getElementById('bricks')
    bricksArea.innerHTML = ''
    for (let row = 0; row < map.length; row++) {
        let rowz = []
        for (let col = 0; col < map[row].length; col++) {
            let mapValue = map[row][col]
            if (mapValue !== 0) {
                let brick = new Brick(BRICK_WIDTH, BRICK_HEIGHT, row, col, brickTypes[mapValue])
                brick.brickElem.id = 'brick-' + index
                bricksArea.appendChild(brick.brickElem)
                index++
                rowz.push(brick)
            } else {
                rowz.push(0)
            }

        }
        bricks.push(rowz)
    }
    return bricks
}


function loop(time) {
    if (lastTime != null) {
        const delta = time - lastTime
        fps.innerHTML = 'FPS:' + (1000 / delta).toFixed(0).toString()
        let powerUps = document.querySelectorAll('#powerUp')
        if (start && !pause) {
            // ball movement

            ball.update(delta, paddle, bricks, gameArea.rect())
            if (bricks.every(el => el.every((el) => el <= 0 || parseInt(el.brickElem.dataset.level) <= 0))) {
                removePowerUp(powerUps)
                if (MAP_INDEX === maps.length - 1) { // game win
                    win = true
                    firstLevel = true
                    displayStory()
                    gameOver()
                    MAP_INDEX = 0
                } else { // next level
                    win = true
                    MAP_INDEX++
                    firstLevel = false
                    PADDLE_WIDTH = 100
                    paddle.paddleElem.style.width = PADDLE_WIDTH + 'px'
                    setupGame(MAP_INDEX, false)
                    displayStory()

                }
            }
        }
        //power ups
        if (!pause) {
            powerUps.forEach(powerUp => {
                if (powerUp !== null) {
                    powerUp.style.animationPlayState = 'running';
                    if (powerUpCollision(paddle, powerUp)) {
                        if (powerUp.dataset.type === 'lives') {
                            player_lives++
                            lives.innerHTML = 'Lives:' + player_lives

                        }
                        if (powerUp.dataset.type === 'extend') {
                            PADDLE_WIDTH += PADDLE_EXTEND
                            paddle.paddleElem.style.width = PADDLE_WIDTH + 'px'
                            paddle.x -= EXTEND_OFFSET
                        }
                        powerUp.remove()
                    } else if (powerUp.getBoundingClientRect().top >= gameArea.rect().bottom) {
                        powerUp.remove()
                    }

                }
            })
            // paddle movement
            if (leftArrow && paddle.x > 0) {
                paddle.x -= PADDLE_SPEED
                if (!start) {
                    ball.x = paddle.x + PADDLE_WIDTH / 2
                }
            } else if (rightArrow && paddle.x + PADDLE_WIDTH < WIDTH) {
                paddle.x += PADDLE_SPEED
                if (!start) {
                    ball.x = paddle.x + PADDLE_WIDTH / 2
                }
            }
            let ballRect = ball.rect()
            if (ballRect.top >= gameArea.rect().bottom) {
                // die
                player_lives--
                lives.innerHTML = 'Lives:' + player_lives
                PADDLE_WIDTH = 100
                paddle.paddleElem.style.width = PADDLE_WIDTH + 'px'
                if (player_lives === 0) { // lose game
                    pauseGame({ key: 'p' })
                    MAP_INDEX = 0
                    firstLevel = true
                    gameOver()
                } else {
                    ball.reset(BALL_X, BALL_Y)
                    paddle.reset(PADDLE_X, PADDLE_Y)
                    document.addEventListener("keypress", startGame)
                }
                start = false
            }
        } else {
            powerUps.forEach(powerUp => {
                if (powerUp !== null) {
                    powerUp.style.animationPlayState = 'paused';

                }
            })
        }

    }
    lastTime = time
    requestAnimationFrame(loop)
}
loop()

function startGame(event) {
    if (event.key === ' ') {
        start = true
        document.removeEventListener("keypress", startGame)
        if (newLevel) {
            startTime = Date.now() - pauseTime
            newLevel = false
        }
        startTimer()
    }
}

function pauseGame(event) {
    if (event.key === 'p') {
        pause = !pause
        if (pause) {
            pauseScreen.style.display = 'flex'
            document.getElementById('restart-btn').addEventListener('click', () => {
                gameOver()
                setupGame(MAP_INDEX = 0, true)
            })
            pauseTime = elapsedTime
            pauseTimer()
        } else {
            pauseScreen.style.display = 'none'
            startTime = Date.now() - pauseTime
            startTimer()
        }
    }
}

function removePowerUp(powerUps) {
    powerUps.forEach(powerUp => {
        if (powerUp !== null) {
            powerUp.remove()
        }
    })
}

// Timer
function formatTime(time) {
    const minutes = Math.floor(time / 60000)
    const seconds = Math.floor((time % 60000) / 1000)
    return `${minutes < 10 ? '0' : ''}${minutes}:${seconds < 10 ? '0' : ''}${seconds}`
}

function startTimer() {
    if (startTime === 0) {
        startTime = Date.now()
    } 
    timerInterval = setInterval(() => {
        elapsedTime = Date.now() - startTime
        if (timerInterval) {
            timer.textContent = formatTime(elapsedTime)
        }
    }, 1000)
}

function pauseTimer() {
    if (timerInterval) {
        clearInterval(timerInterval)
        timerInterval = null
        timer.textContent = formatTime(elapsedTime)
    }
}

function resetTimer() {
    clearInterval(timerInterval)
    startTime = 0
    elapsedTime = 0
    timerInterval = null
    timer.textContent = formatTime(elapsedTime)
}

function powerUpCollision(paddle, powerUp) {
    if (paddle.rect().top <= powerUp.getBoundingClientRect().bottom &&
        paddle.rect().right >= powerUp.getBoundingClientRect().left &&
        paddle.rect().left <= powerUp.getBoundingClientRect().right) {
        powerUpSound()
        return true
    }
}

// WebSockets
let socket = null
let jsonData = {}

window.onbeforeunload = function () {
    jsonData["action"] = "player_disconnected"
    socket.send(JSON.stringify(jsonData))
}

document.addEventListener("DOMContentLoaded", function () {
    socket = new WebSocket("ws://localhost:8080/ws")

    socket.onopen = () => {
        console.log("Successfully connected")
        jsonData["action"] = "player_connected"
        socket.send(JSON.stringify(jsonData))
    }

    socket.onclose = () => {
        console.log("Connection closed")
    }

    socket.onerror = (err) => {
        console.log("There was an error")
    }

    socket.onmessage = (msg) => {
        let data = JSON.parse(msg.data)
        switch (data.action) {
            case "player_count":
                numPlayers.innerHTML = "Players online:" + data.players
                break
            case "update_scoreboard":
                scoreboard = data.scoreboard
                loadScoreBoard(scoreboard)
                break
        }
    }
})
function insertScore() {
    let name = document.getElementById('name')
    if (name.value === "") {
        alert('Please insert name')
    } else {
        let jsonData = {}
        jsonData["action"] = "insert_score"
        jsonData["score"] = {
            "name": name.value,
            "score": score,
            "time": elapsedTime
        }
        socket.send(JSON.stringify(jsonData))
        name.value = ""
        setupGame(0, true)
    }
}
let scoreboard = []
const pageSize = 5
let currentPage = 1
const tableBody = document.getElementById("data")

const loadScoreBoard = (scoreboard) => {
    tableBody.innerHTML = ""
    scoreboard
        .filter((row, index) => {
            let start = (currentPage - 1) * pageSize
            let end = currentPage * pageSize
            if (index >= start && index < end) return true
        })
        .forEach((player, index) => {
            fillTable(player, index)
        })
}

const previousPage = () => {
    if (currentPage > 1) {
        currentPage--
        loadScoreBoard(scoreboard)
    }
};

const nextPage = () => {
    if (currentPage * pageSize < scoreboard.length) {
        currentPage++
        loadScoreBoard(scoreboard)
    }
};

document
    .getElementById("prevBtn")
    .addEventListener("click", previousPage, false);

document
    .getElementById("nextBtn")
    .addEventListener("click", nextPage, false);


const fillTable = (scoreboard, index) => {
    const row = document.createElement("tr");
    // rank
    const rank = (index + 1) + ((currentPage - 1) * pageSize);
    const rankCell = document.createElement("td");
    rankCell.innerHTML = rank;
    row.append(rankCell);
    // name
    const name = scoreboard.name;
    const nameCell = document.createElement("td");
    nameCell.innerHTML = name;
    row.append(nameCell);
    // score
    const score = scoreboard.score;
    const scoreCell = document.createElement("td");
    scoreCell.innerHTML = score;
    row.append(scoreCell);
    // score
    const time = scoreboard.time;
    const timeCell = document.createElement("td");
    timeCell.innerHTML = formatTime(time);
    row.append(timeCell);
    tableBody.append(row);
}

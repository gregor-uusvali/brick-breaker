export default class GameArea {
    constructor(gameAreaElem, width, height) {
        this.gameAreaElem = gameAreaElem
        this.reset(width, height)
    }

    rect() {
        return this.gameAreaElem.getBoundingClientRect()
    }

    reset(width, height) {
        this.gameAreaElem.style.width = width + 'px'
        this.gameAreaElem.style.height = height + 'px'
    }
}
export default class Brick {
    constructor(width, height, row, col, type) {
        this.brickElem = document.createElement('div')
        this.brickElem.classList.add('brick')
        this.brickElem.style.width = width + 'px'
        this.brickElem.style.height = height + 'px'
        this.brickElem.style.left = width * col + 'px'
        this.brickElem.style.top = height * row + 'px'
        this.brickElem.style.border = type.border
        this.brickElem.dataset.level = type.level
        this.brickElem.dataset.score = type.score
        this.brickElem.style["background-color"] = type.color
    }

    rect() {
        return this.brickElem.getBoundingClientRect()
    }
}

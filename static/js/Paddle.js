export default class Paddle {
    constructor(paddleElem, width, height, startX, startY) {
        this.paddleElem = paddleElem
        this.reset(startX, startY, width, height)
    }

    get x() {
        return parseFloat(getComputedStyle(this.paddleElem).transform.split(",")[4])
    }

    set x(value) {
        this.paddleElem.style.transform = `translate(${value}px, ${this.y}px)`
    }

    get y() {
        return parseFloat(getComputedStyle(this.paddleElem).transform.split(",")[5].trim().split(")")[0])
    }

    set y(value) {
        this.paddleElem.style.transform = `translate(${this.x}px, ${value}px)`
    }

    rect() {
        return this.paddleElem.getBoundingClientRect()
    }

    reset(startX, startY, width, height) {
        this.x = startX
        this.y = startY
        this.paddleElem.style.width = width + 'px'
        this.paddleElem.style.height = height + 'px'
    }
}

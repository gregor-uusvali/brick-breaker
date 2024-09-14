export default class PowerUp {
    constructor(startX, startY, type) {
        this.powerUpElem = document.createElement('div')
        this.powerUpElem.style.left = startX
        this.powerUpElem.style.top = startY
        this.powerUpElem.style.backgroundImage = type.background
        this.powerUpElem.dataset.type = type.type
    }

    rect() {
        return this.powerUpElem.getBoundingClientRect()
    }

}

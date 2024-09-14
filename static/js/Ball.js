import PowerUp from './PowerUp.js'
import { sfx } from './index.js'
import { updateScore } from './index.js'
import { powerUpTypes } from './PowerUpTypes.js'
const INITIAL_VELOCITY = .55
const VELOCITY_INCREASE = .00001
const ERROR_MARGIN = 2
const SOUND_FX_VOL = 0.1

export default class Ball {
    constructor(ballElem, ballSize, startX, startY) {
        this.ballElem = ballElem
        this.ballElem.style.width = ballSize + 'px'
        this.ballElem.style.height = ballSize + 'px'
        this.reset(startX, startY)
    }

    get x() {
        return parseFloat(getComputedStyle(this.ballElem).getPropertyValue("--x"))
    }

    set x(value) {
        this.ballElem.style.setProperty("--x", value)
    }

    get y() {
        return parseFloat(getComputedStyle(this.ballElem).getPropertyValue("--y"))
    }

    set y(value) {
        this.ballElem.style.setProperty("--y", value)
    }

    rect() {
        return this.ballElem.getBoundingClientRect()
    }

    reset(startX, startY) {
        this.x = startX
        this.y = startY
        const maxAngle = Math.PI / 9 // 20 degrees
        const heading = randomNumberBetween(-maxAngle, maxAngle) - Math.PI / 2
        this.direction = { x: Math.cos(heading), y: Math.sin(heading) }
        this.velocity = INITIAL_VELOCITY
    }

    update(delta, paddle, bricks, gameArea) {
        this.x += this.direction.x * this.velocity * delta
        this.y += this.direction.y * this.velocity * delta
        if (paddleCollision(this, paddle, delta)) { return }
        wallCollision(this, gameArea)
        brickCollision(this, bricks)
    }
}

function randomNumberBetween(min, max) {
    return Math.random() * (max - min) + min
}

function paddleCollision(ball, paddle, delta) {
    if (
        ball.rect().left <= paddle.rect().right &&
        ball.rect().right >= paddle.rect().left &&
        ball.rect().top <= paddle.rect().bottom &&
        ball.rect().bottom >= paddle.rect().top
    ) {
        let collisionPoint = (ball.x - (paddle.x + paddle.rect().width / 2)) / (paddle.rect().width / 2)
        let angle = (collisionPoint) * (Math.PI / 3)
        ball.direction.x = Math.sin(angle)
        ball.direction.y = -Math.cos(angle)
        ball.velocity += VELOCITY_INCREASE * delta
        paddleSound()
        return true
    }
    return false
}

function wallCollision(ball, gameArea) {
    if (ball.rect().top <= gameArea.top) {
        ball.direction.y *= -1
        ball.y -= ball.rect().top - gameArea.top
    }
    if (ball.rect().left <= gameArea.left) {
        ball.direction.x *= -1
        ball.x += gameArea.left - ball.rect().left
    }
    if (ball.rect().right >= gameArea.right) {
        ball.direction.x *= -1
        ball.x -= ball.rect().right - gameArea.right
    }
}

function brickCollision(ball, bricks) {
    for (let row = 0; row < bricks.length; row++) {
        for (let col = 0; col < bricks[row].length; col++) {
            let brick = bricks[row][col]
            let collision = collisionDirection(ball, brick)

            if (brick !== 0 && collision) {
                if (getRandomInt(100) < 5 && parseInt(brick.brickElem.dataset.level) > 0) {
                    addPowerUp(brick)
                }
                let validBall = validBallCollisions(ball.direction.x, ball.direction.y)
                let validBrick = validBrickCollisions(bricks, row, col)
                if (validBrick.length === 1 && validBall.includes(validBrick[0])) {
                    collision = validBrick[0]
                } else if (!validBall.includes(collision) || !validBrick.includes(collision)) {
                    collision = collisionCorrection(collision, validBall, validBrick)
                }
                collide(ball, brick, collision)
                let level = updateBrickLevel(brick)
                if (level == 0) {
                    updateScore(parseInt(brick.brickElem.dataset.score))
                    bricks[row][col] = 0
                } else {
                    animate(brick)
                }
                brickSound(level)
            }
        }
    }
}

function addPowerUp(brick) {
    const powerUp = new PowerUp(brick.brickElem.style.left, brick.brickElem.style.top, powerUpTypes[getRandomInt(2)])
    powerUp.powerUpElem.id = 'powerUp'
    document.getElementById('game-area').appendChild(powerUp.powerUpElem)
}
function getRandomInt(max) {
    return Math.floor(Math.random() * max);
}
function paddleSound() {
    if (sfx) {
        const paddleSound = new Audio('/static/audio/fx/paddle.mp3')
        paddleSound.volume = SOUND_FX_VOL
        paddleSound.play()
    }
}

function brickSound(level) {
    if (sfx) {
        if (level === 0) {
            const brickDeath = new Audio('/static/audio/fx/brick-death.mp3')
            brickDeath.volume = SOUND_FX_VOL
            brickDeath.play()
        } else if (level > 0) {
            const brickSilver = new Audio('/static/audio/fx/brick-silver.mp3')
            brickSilver.volume = SOUND_FX_VOL
            brickSilver.play()
        } else {
            const brickGold = new Audio('/static/audio/fx/brick-gold.mp3')
            brickGold.volume = SOUND_FX_VOL
            brickGold.play()
        }
    }
}


export function powerUpSound() {
    if (sfx) {
        const powerUpSound = new Audio('/static/audio/fx/powerup.mp3')
        powerUpSound.volume = SOUND_FX_VOL * 2
        powerUpSound.play()
    }
}
function animate(brick) {
    brick.brickElem.classList.add('flash')
    let timer = setTimeout(function () {
        brick.brickElem.classList.remove('flash')
        clearTimeout(timer)
    }, 200)
}

function collisionCorrection(collision, validBall, validBrick) {
    let invalid
    if (collision === 'right') {
        invalid = 'left'
    } else if (collision === 'left') {
        invalid = 'right'
    } else if (collision === 'top') {
        invalid = 'bottom'
    } else if (collision === 'bottom') {
        invalid = 'top'
    }
    collisionCorrection:
    for (let i = 0; i < validBall.length; i++) {
        for (let j = 0; j < validBrick.length; j++) {
            if (validBall[i] === validBrick[j] && validBall[i] !== invalid) {
                collision = validBall[i]
                break collisionCorrection
            }
        }
    }
    return collision
}

function collide(ball, brick, direction) {
    if (direction === 'bottom') {
        if (ball.rect().top <= brick.rect().bottom) {
            ball.y += brick.rect().bottom - ball.rect().top + ERROR_MARGIN
        }
        ball.direction.y *= -1
    } else if (direction === 'top') {
        if (ball.rect().bottom >= brick.rect().top) {
            ball.y -= ball.rect().bottom - brick.rect().top + ERROR_MARGIN
        }
        ball.direction.y *= -1
    } else if (direction === 'left') {
        if (ball.rect().right >= brick.rect().left) {
            ball.x -= ball.rect().right - brick.rect().left + ERROR_MARGIN
        }
        ball.direction.x *= -1
    } else if (direction === 'right') {
        if (ball.rect().left <= brick.rect().right) {
            ball.x += brick.rect().right - ball.rect().left + ERROR_MARGIN
        }
        ball.direction.x *= -1
    }
}

function validBallCollisions(x, y) {
    if (x >= 0 && y >= 0) {
        return ['left', 'top']
    } else if (x >= 0 && y <= 0) {
        return ['left', 'bottom']
    } else if (x <= 0 && y >= 0) {
        return ['right', 'top']
    } else if (x <= 0 && y <= 0) {
        return ['right', 'bottom']
    }
}

function validBrickCollisions(bricks, row, col) {
    let valid = []
    if (row - 1 >= 0) {
        if (bricks[row - 1][col] === 0) {
            valid.push('top')
        }
    }
    if (row + 1 < bricks.length) {
        if (bricks[row + 1][col] === 0) {
            valid.push('bottom')
        }
    }
    if (col - 1 >= 0) {
        if (bricks[row][col - 1] === 0) {
            valid.push('left')
        }
    }
    if (col + 1 < bricks[row].length) {
        if (bricks[row][col + 1] === 0) {
            valid.push('right')
        }
    }

    return valid
}

function collisionDirection(ball, brick) {
    if (brick === 0) {
        return null
    }
    let ballX = ball.rect().left + ball.rect().width / 2
    let ballY = ball.rect().top + ball.rect().height / 2

    let brickX = brick.rect().left + brick.rect().width / 2
    let brickY = brick.rect().top + brick.rect().height / 2

    let dx = ballX - brickX
    let dy = ballY - brickY

    let width = (ball.rect().width + brick.rect().width) / 2
    let height = (ball.rect().height + brick.rect().height) / 2

    let crossWidth = width * dy
    let crossHeight = height * dx

    if (Math.abs(dx) <= width && Math.abs(dy) <= height) {
        if (crossWidth > crossHeight) {
            return (crossWidth > -crossHeight) ? 'bottom' : 'left'
        } else {
            return (crossWidth > -crossHeight) ? 'right' : 'top'
        }
    }

    return null
}

function updateBrickLevel(brick) {
    let level = parseInt(brick.brickElem.dataset.level) - 1
    if (level === 0) {
        brick.brickElem.style.display = "none"
    }
    brick.brickElem.dataset.level = level
    return level
}


module.exports = class Vector3 {
    constructor(x = 0, y = 0, z = 0) {
        this.x = x;
        this.y = y;
        this.z = z;
    }

    Magnitude() {
        return Math.sqrt((this.x * this.x) + (this.y * this.y));
    }

    Normalize() {
        var mag = this.Magnitude();
        return new Vector3(this.x / mag, this.y / mag);
    }

    Distance(OtherVect = Vector2) {
        var direction = new Vector2();
        direction.x = OtherVect.x - this.x;
        direction.y = OtherVect.y - this.y;
        return direction.Magnitude();
    }

    ConsoleOutput() {
        return '(' + this.x + ',' + this.y + ')';
    }
}
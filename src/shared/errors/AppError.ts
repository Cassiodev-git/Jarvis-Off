export class AppError extends Error {
    public readonly statusCode: Number

    constructor(message: string, statusCode: number = 400){
        super(message)
        this.statusCode = statusCode
        Object.setPrototypeOf(this, AppError.prototype);
    }
    
}
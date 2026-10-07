
class User{
    private _name : string
    private _password : string
    private _username : string
    private _email : string
    private _profile_picture : boolean = false
    private _favorite_genres : Array<string> = []

    public constructor(name:string, password:string, username:string, email:string){
        this._name = name
        this._password = password
        this._username = username
        this._email = email
    }

    get name() : string{
        return this._name
    }

    get username() : string{
        return this._username
    }

    get email() : string{
        return this._email 
    }

    get profile_picture() : boolean{
        return this._profile_picture
    }

    get favorite_genres() : Array<string>{
        return this._favorite_genres
    }

    set name(newName : string){
        this._name = newName
    }

    set username(newUsername : string){
        this._username = newUsername // (maybe) TODO: add username validation (non-duplicate)
    }

    set email(newEmail : string){
        this._email = newEmail // TODO: add email verification
    }

    set profile_picture(pic : boolean){
        this._profile_picture = pic
    }

    set favorite_genres(newGenres : Array<string>){
        this._favorite_genres = newGenres
    }

    private usernameIsValid(username:string) : boolean{
        const validity : boolean = false
        // TODO: add validation for the username regarding:
        // - non-duplicate
        // - non-offensive?
        // Check for libraries that can accomplish validate emails
        return validity
    }

    private emailIsValid(email:string) : boolean{
        const validity : boolean = false
        // TODO: add validation for the username regarding:
        // - non-duplicate
        // - non-offensive?
        // Check for libraries that can accomplish validate emails
        return validity
    }
}
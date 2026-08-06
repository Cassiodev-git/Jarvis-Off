import { exec } from "node:child_process";
import { promisify } from "util";
import { AppError } from "../../shared/errors/AppError";


const execPromise = promisify(exec)

export class DevelopmentPlugin{
    public async openEnvironment(): Promise<string>{
        console.log('Iniciando comandos de desenvolvedor...')
        try{
            // Abre o vsCode 
            execPromise('code &').catch((err) => {
                throw new AppError(`Falha ao abrir o vsCode: ${err.menssage}`, 500)
            })
            //Abre o brave 
            const braveCommand = '(brave-browser || brave || flatpak run com.brave.Browser) >/dev/null 2>&1 &'
            execPromise(braveCommand).catch((err) => {
                throw new AppError(`Falha ao abrir o navegador Brave: ${err.message}`, 500);
            });
            return 'Anbiente de desenvolvimento iniciado...'
        }catch(error){
            if(error instanceof AppError){
                throw error;
            }
            throw new AppError(
                `Erro inesperado no plugin de desenvolvimento ${(error as Error).message}`,
                500
            )
        }
    }
}
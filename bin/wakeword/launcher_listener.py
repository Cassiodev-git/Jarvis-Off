import sys
import os
import subprocess
import json
import time

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_DIR = os.path.abspath(os.path.join(SCRIPT_DIR, "../../"))
MODEL_PATH = os.path.join(SCRIPT_DIR, "vosk-model-pt")

# Palavras/frases de acionamento
# Quanto mais variações/sinônimos você colocar, mais fácil ele ativa
TRIGGER_PHRASES = [
    "acorda criança", 
    "acorda crianca", 
    "acorda", 
    "bom dia", 
    "jarvis",
    "fala jarvis"
]

def is_app_running():
    """Verifica se o terminal com a aplicação principal já está aberto."""
    try:
        output = subprocess.check_output(["pgrep", "-f", "src/app.ts"]).decode().strip()
        return len(output) > 0
    except Exception:
        return False

def close_existing_terminals():
    """Garante o encerramento de qualquer terminal anterior do Jarvis."""
    try:
        subprocess.run(["pkill", "-f", "src/app.ts"], stderr=subprocess.DEVNULL)
    except Exception:
        pass

def main():
    if not os.path.exists(MODEL_PATH):
        print(f"❌ Modelo Vosk não encontrado em '{MODEL_PATH}'.", flush=True)
        sys.exit(1)

    print("🤖 [Ouvinte Vosk]: Inicializando escuta em segundo plano...", flush=True)

    try:
        from vosk import Model, KaldiRecognizer
        model = Model(MODEL_PATH)
        grammar = json.dumps(TRIGGER_PHRASES + ["[unk]"])
        recognizer = KaldiRecognizer(model, 16000, grammar)
    except Exception:
        try:
            from vosk import Model, KaldiRecognizer
            model = Model(MODEL_PATH)
            recognizer = KaldiRecognizer(model, 16000)
        except Exception as e:
            print(f"❌ Erro ao inicializar Vosk: {e}", flush=True)
            sys.exit(1)

    cmd = [
        'rec', '-q',
        '-c', '1',
        '-r', '16000',
        '-b', '16',
        '-e', 'signed-integer',
        '-t', 'raw',
        '-'
    ]

    try:
        process = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.DEVNULL)
    except Exception as e:
        print(f"❌ Erro ao iniciar microfone: {e}", flush=True)
        sys.exit(1)

    print("⚡ [Ouvinte Ativo]: Aguardando 'Acorda Criança' ou 'Bom Dia'...", flush=True)

    CHUNK_SIZE = 4000

    while True:
        # Se o aplicativo já estiver rodando, aguarda
        if is_app_running():
            time.sleep(2)
            continue

        data = process.stdout.read(CHUNK_SIZE)
        if len(data) == 0:
            continue

        if recognizer.AcceptWaveform(data):
            result = json.loads(recognizer.Result())
            text = result.get("text", "").strip().lower()

            if text and text != "[unk]":
                print(f"🎙️ [Vosk escutou]: '{text}'", flush=True)

                if any(phrase in text for phrase in TRIGGER_PHRASES):
                    print(f"⚡ [GATILHO DETECTADO]: '{text}' -> Abrindo terminal...", flush=True)

                    close_existing_terminals()

                    env = os.environ.copy()
                    env["DISPLAY"] = ":0"
                    
                    # Executa o aplicativo e fecha o terminal imediatamente ao finalizar (sem exec bash)
                    terminal_cmd = f'cd "{PROJECT_DIR}" && npx tsx src/app.ts'

                    try:
                        subprocess.Popen(['gnome-terminal', '--', 'bash', '-c', terminal_cmd], env=env)
                    except Exception:
                        subprocess.Popen(['x-terminal-emulator', '-e', f'bash -c "{terminal_cmd}"'], env=env)

                    time.sleep(8)

if __name__ == "__main__":
    main()
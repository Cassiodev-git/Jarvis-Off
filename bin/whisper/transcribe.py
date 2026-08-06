import sys
import os
import wave
import json
from vosk import Model, KaldiRecognizer

def main():
    if len(sys.argv) < 2:
        return

    audio_path = sys.argv[1]

    if not os.path.exists(audio_path):
        return

    # Caminho do modelo Vosk PT-BR salvo em bin/wakeword/vosk-model-pt
    script_dir = os.path.dirname(os.path.abspath(__file__))
    model_path = os.path.abspath(os.path.join(script_dir, "../wakeword/vosk-model-pt"))

    if not os.path.exists(model_path):
        print(f"[Python ERR]: Modelo Vosk não encontrado em '{model_path}'", file=sys.stderr)
        return

    try:
        with wave.open(audio_path, "rb") as wf:
            sample_rate = wf.getframerate()

            # Carrega o modelo leve e inicializa o reconhecedor
            model = Model(model_path)
            rec = KaldiRecognizer(model, sample_rate)

            results = []
            while True:
                data = wf.readframes(4000)
                if len(data) == 0:
                    break
                if rec.AcceptWaveform(data):
                    part = json.loads(rec.Result())
                    text = part.get("text", "").strip()
                    if text:
                        results.append(text)

            # Captura a transcrição do último bloco de áudio
            final_part = json.loads(rec.FinalResult())
            final_text = final_part.get("text", "").strip()
            if final_text:
                results.append(final_text)

            full_text = " ".join(results).strip()

            # Retorna o texto transcrito para o Node.js capturar
            if full_text:
                print(full_text)

    except Exception as e:
        print(f"[Python ERR]: Erro na transcrição com Vosk: {e}", file=sys.stderr)

if __name__ == "__main__":
    main()
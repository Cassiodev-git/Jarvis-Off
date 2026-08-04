import sys
import subprocess
import signal
import numpy as np
import openwakeword
from openwakeword.model import Model

def main():
    try:
        openwakeword.utils.download_models()
        owwModel = Model(wakeword_models=["hey_jarvis"], inference_framework="onnx")
    except Exception as e:
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

    process = None
    try:
        process = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.DEVNULL)
    except Exception as e:
        sys.exit(1)

    # Garante que o processo do rec seja morto ao fechar o script
    def cleanup(signum, frame):
        if process and process.poll() is None:
            process.terminate()
            process.wait()
        sys.exit(0)

    signal.signal(signal.SIGINT, cleanup)
    signal.signal(signal.SIGTERM, cleanup)

    CHUNK_SAMPLES = 1280
    CHUNK_BYTES = CHUNK_SAMPLES * 2

    print("LISTEN_START", flush=True)

    while True:
        try:
            raw_data = process.stdout.read(CHUNK_BYTES)
            if not raw_data or len(raw_data) < CHUNK_BYTES:
                continue

            audio_data = np.frombuffer(raw_data, dtype=np.int16)
            owwModel.predict(audio_data)

            for model_name, scores in owwModel.prediction_buffer.items():
                current_score = scores[-1]

                # Sensibilidade equilibrada (0.30)
                if current_score > 0.30:
                    print("WAKE_WORD_DETECTED", flush=True)
                    if process and process.poll() is None:
                        process.terminate()
                        process.wait()
                    sys.exit(0)

        except Exception as e:
            if process and process.poll() is None:
                process.terminate()
            sys.exit(1)

if __name__ == "__main__":
    main()
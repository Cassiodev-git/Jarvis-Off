import sys
import os
import whisper

def main():
    if len(sys.argv) < 2:
        return

    audio_path = sys.argv[1]

    if not os.path.exists(audio_path):
        return

    try:
        model = whisper.load_model("base")
        result = model.transcribe(audio_path, language="pt")
        print(result["text"].strip())
    except Exception as e:
        print("", file=sys.stderr)

if __name__ == "__main__":
    main()
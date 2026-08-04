import sys
import asyncio
import edge_tts

async def main():
    if len(sys.argv) < 2:
        print("Erro: Nenhum texto fornecido para síntese.")
        sys.exit(1)

    text_to_speak = sys.argv[1]
    output_file = sys.argv[2] if len(sys.argv) > 2 else "temp_response.wav"

    # Configuração da Voz do Jarvis
    VOICE = "pt-BR-AntonioNeural"
    RATE = "+0%"     # Ajuste de velocidade (ex: "+5%", "-10%")
    PITCH = "-4Hz"   # Torna o tom levemente mais grave e imponente

    communicate = edge_tts.Communicate(
        text=text_to_speak, 
        voice=VOICE, 
        rate=RATE, 
        pitch=PITCH
    )
    
    await communicate.save(output_file)
    print("OK")

if __name__ == "__main__":
    asyncio.run(main())

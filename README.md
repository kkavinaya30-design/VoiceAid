
# VoiceAid – Voice-Activated Ambulance Traffic Alert System

🌐 **Live Demo:** [Open VoiceAid](https://kkavinaya30-design.github.io/VoiceAid/)

🎥 **Demo Video:** https://youtu.be/Zh3iWBEQOfo

VoiceAid is a browser-based hackathon prototype that simulates a voice-activated ambulance route alert. It uses a fixed route through Gandhipuram, Ganapathy, Peelamedu and Singanallur. It does not use GPS, contact vehicles, or send alerts on public roads.

## Features

- Voice command activation with the browser Web Speech API: say **“Start ambulance alert.”**
- Dashboard for Ambulance 1, driver Kumar, route position and simulated arrival time.
- Fixed route simulation. Each simulated minute takes about two real seconds; each road leg is set to ten simulated minutes.
- At five simulated minutes from a road, only the vehicles assigned to that road receive the alert. The warning is spoken when browser text-to-speech is available and is also shown in the dashboard and alert history.
- Responsive dark dashboard with current road vehicle assignments and event history.

## Run locally

Open `index.html` in a modern browser. For more consistent microphone permissions, serve the folder from localhost:

```sh
python -m http.server 8000
```

Then open <http://localhost:8000>. You can use another static file server if Python is unavailable.

If speech recognition is unsupported, the dashboard shows that status and offers **Activate by typing command** as a simulation fallback. Type “Start ambulance alert” to start the route.

## Run with Docker Compose

From this project folder, run:

```sh
docker compose up --build
```

Open <http://localhost:8080>. Stop the foreground service with `Ctrl+C`; to stop and remove the container afterward, run:

```sh
docker compose down
```

## Browser voice limitations

Speech recognition support varies by browser and operating system. Chromium based browsers are generally the best option, but availability and language recognition can vary. The browser may request microphone permission, and some implementations require a secure context (HTTPS or localhost). Recognition can mishear speech or end after silence, so retry the microphone if needed. The text command control is only a prototype fallback and does not represent voice recognition.

Speech synthesis depends on the browser and installed system voices. Audio may require a user gesture, and a device may have no usable voice. If synthesis is missing or cannot start, VoiceAid still displays the exact warning in the dashboard and event history.

## Simulation scope

The route and vehicle assignments are hardcoded for this demonstration. Timing is illustrative and not calibrated to actual distance or traffic. The prototype does not use live maps, location tracking, vehicle communications, or public emergency alert infrastructure. No API keys are needed.

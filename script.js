(() => {
  'use strict';

  const WARNING = 'Emergency! An ambulance is approaching. Please move aside and clear the way.';
  const COMMAND = 'start ambulance alert';
  const SIMULATED_MINUTE_MS = 2000;
  const LEG_MINUTES = 10;
  const ALERT_MINUTES = 5;
  const ROUTE = ['Gandhipuram', 'Ganapathy', 'Peelamedu', 'Singanallur'];
  const VEHICLES = {
    Ganapathy: [
      { id: 'TN38AB1234', type: 'Car' },
      { id: 'TN38CD5678', type: 'Bike' }
    ],
    Peelamedu: [{ id: 'TN38EF9012', type: 'Car' }],
    Singanallur: [{ id: 'TN38GH3456', type: 'Bike' }]
  };

  const elements = {
    voiceStatus: document.querySelector('#voiceStatus'),
    voiceHint: document.querySelector('#voiceHint'),
    micButton: document.querySelector('#micButton'),
    micButtonText: document.querySelector('#micButtonText'),
    demoButton: document.querySelector('#demoButton'),
    unitState: document.querySelector('#unitState'),
    currentLocation: document.querySelector('#currentLocation'),
    upcomingRoad: document.querySelector('#upcomingRoad'),
    etaValue: document.querySelector('#etaValue'),
    progressBar: document.querySelector('#progressBar'),
    alertBanner: document.querySelector('#alertBanner'),
    alertBannerText: document.querySelector('#alertBannerText'),
    vehicleCount: document.querySelector('#vehicleCount'),
    vehicleList: document.querySelector('#vehicleList'),
    historyList: document.querySelector('#historyList'),
    historyCount: document.querySelector('#historyCount'),
    speechNotice: document.querySelector('#speechNotice'),
    routeList: document.querySelector('#routeList')
  };

  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  let recognition = null;
  let activated = false;
  let listening = false;
  let legIndex = 1;
  let remainingMinutes = LEG_MINUTES;
  let simulationTimer = null;
  const alertedVehicles = new Set();
  const eventLog = [];

  function updateVoiceStatus(label, kind, hint) {
    elements.voiceStatus.textContent = label;
    elements.voiceStatus.className = `status-pill status-${kind}`;
    elements.voiceHint.textContent = hint;
  }

  function nowLabel() {
    return new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' }).format(new Date());
  }

  function addHistory(title, detail) {
    eventLog.unshift({ time: nowLabel(), title, detail });
    renderHistory();
  }

  function renderHistory() {
    elements.historyCount.textContent = `${eventLog.length} ${eventLog.length === 1 ? 'EVENT' : 'EVENTS'}`;
    if (!eventLog.length) {
      elements.historyList.innerHTML = '<div class="empty-history"><span>◷</span><p>Alert events will appear here once the route simulation begins.</p></div>';
      return;
    }
    elements.historyList.innerHTML = eventLog.map(event => `
      <div class="history-item">
        <time class="history-time">${event.time}</time>
        <div class="history-copy"><strong>${escapeHtml(event.title)}</strong><small>${escapeHtml(event.detail)}</small></div>
      </div>`).join('');
  }

  function escapeHtml(value) {
    return value.replace(/[&<>"']/g, character => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[character]));
  }

  function currentRoad() {
    return ROUTE[legIndex] || null;
  }

  function formatTime(minutes) {
    const seconds = Math.max(0, Math.round(minutes * 60));
    return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
  }

  function renderRoute() {
    const stops = elements.routeList.querySelectorAll('.route-stop');
    stops.forEach((stop, index) => {
      stop.classList.toggle('complete', index < legIndex);
      stop.classList.toggle('active', index === legIndex);
      const label = stop.querySelector('small');
      if (index === legIndex) {
        if (!label) stop.insertAdjacentHTML('beforeend', '<small>UP NEXT</small>');
        else label.textContent = 'UP NEXT';
      } else if (label && label.textContent === 'UP NEXT') {
        label.remove();
      }
    });
  }

  function renderVehicles() {
    const road = currentRoad();
    const vehicles = road ? VEHICLES[road] : [];
    elements.vehicleCount.textContent = `${vehicles.length} ${vehicles.length === 1 ? 'vehicle' : 'vehicles'}`;
    if (!vehicles.length) {
      elements.vehicleList.innerHTML = '<div class="empty-history"><p>All route roads have been completed.</p></div>';
      return;
    }
    elements.vehicleList.innerHTML = vehicles.map(vehicle => {
      const key = `${road}:${vehicle.id}`;
      const sent = alertedVehicles.has(key);
      const icon = vehicle.type === 'Car' ? '▰' : '◢';
      return `<div class="vehicle-row">
        <span class="vehicle-type-icon" aria-hidden="true">${icon}</span>
        <span class="vehicle-info"><strong>${vehicle.id}</strong><small>${vehicle.type} · ${road}</small></span>
        <span class="vehicle-alert-state ${sent ? 'sent' : ''}">${sent ? 'ALERT SENT' : 'WAITING'}</span>
      </div>`;
    }).join('');
  }

  function renderProgress() {
    const road = currentRoad();
    if (!road) {
      elements.upcomingRoad.textContent = 'Route complete';
      elements.etaValue.innerHTML = '— <small>min</small>';
      elements.progressBar.style.width = '100%';
      elements.currentLocation.textContent = ROUTE[ROUTE.length - 1];
      return;
    }
    elements.upcomingRoad.textContent = road;
    elements.etaValue.innerHTML = `${formatTime(remainingMinutes)} <small>min</small>`;
    elements.progressBar.style.width = `${((LEG_MINUTES - remainingMinutes) / LEG_MINUTES) * 100}%`;
    elements.currentLocation.textContent = legIndex === 1 ? ROUTE[0] : ROUTE[legIndex - 1];
  }

  function renderDashboard() {
    renderRoute();
    renderVehicles();
    renderProgress();
  }

  function speakWarning() {
    if (!('speechSynthesis' in window) || typeof SpeechSynthesisUtterance === 'undefined') {
      elements.speechNotice.textContent = 'Text-to-speech is unavailable in this browser. The warning remains visible in the dashboard.';
      return false;
    }
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(WARNING);
      utterance.rate = 1;
      utterance.pitch = 1;
      window.speechSynthesis.speak(utterance);
      elements.speechNotice.textContent = `Spoken warning: “${WARNING}”`;
      return true;
    } catch (error) {
      elements.speechNotice.textContent = 'Text-to-speech could not start. The warning remains visible in the dashboard.';
      return false;
    }
  }

  function triggerRoadAlert() {
    const road = currentRoad();
    if (!road) return;
    const newlyAlerted = [];
    VEHICLES[road].forEach(vehicle => {
      const key = `${road}:${vehicle.id}`;
      if (!alertedVehicles.has(key)) {
        alertedVehicles.add(key);
        newlyAlerted.push(vehicle.id);
      }
    });
    if (!newlyAlerted.length) return;
    elements.alertBanner.classList.add('is-alert');
    elements.alertBannerText.textContent = `Warning sent to ${newlyAlerted.length} vehicle${newlyAlerted.length === 1 ? '' : 's'} on ${road}`;
    elements.speechNotice.textContent = `Warning: “${WARNING}”`;
    speakWarning();
    addHistory(`Approaching ${road}: alert sent`, `${newlyAlerted.join(', ')} · ${WARNING}`);
    renderVehicles();
  }

  function finishLeg() {
    const arrivedAt = currentRoad();
    elements.currentLocation.textContent = arrivedAt;
    addHistory(`Ambulance reached ${arrivedAt}`, 'Moving to the next road on the predefined route.');
    legIndex += 1;
    if (legIndex >= ROUTE.length) {
      clearInterval(simulationTimer);
      simulationTimer = null;
      elements.unitState.innerHTML = '<i></i> ROUTE COMPLETE';
      elements.unitState.classList.remove('is-active');
      elements.alertBanner.classList.remove('is-alert');
      elements.alertBannerText.textContent = 'Predefined route completed';
      elements.voiceHint.textContent = 'The ambulance has reached Singanallur. Simulation complete.';
      addHistory('Route simulation complete', 'Ambulance reached Singanallur.');
      renderDashboard();
      return;
    }
    remainingMinutes = LEG_MINUTES;
    elements.alertBanner.classList.remove('is-alert');
    elements.alertBannerText.textContent = `Next approach: ${currentRoad()}`;
    renderDashboard();
  }

  function tickSimulation() {
    if (!activated || !currentRoad()) return;
    remainingMinutes = Math.max(0, remainingMinutes - 1);
    renderProgress();
    if (remainingMinutes === ALERT_MINUTES) triggerRoadAlert();
    if (remainingMinutes === 0) finishLeg();
  }

  function activateSystem(source) {
    if (activated) return;
    activated = true;
    elements.micButton.disabled = true;
    elements.micButtonText.textContent = 'Alert system active';
    elements.unitState.innerHTML = '<i></i> EN ROUTE';
    elements.unitState.classList.add('is-active');
    elements.alertBannerText.textContent = 'Route simulation started';
    updateVoiceStatus('Activated', 'active', `Command recognized${source ? ` via ${source}` : ''}. The fixed route simulation is running.`);
    addHistory('Ambulance alert activated', 'Kumar · Gandhipuram to Singanallur · predefined route');
    renderDashboard();
    simulationTimer = window.setInterval(tickSimulation, SIMULATED_MINUTE_MS);
  }

  function handleTranscript(transcript) {
    const normalized = transcript.toLowerCase().replace(/[.!?,]/g, '').trim();
    if (normalized.includes(COMMAND)) {
      updateVoiceStatus('Command heard', 'active', `Heard: “${transcript}”`);
      activateSystem('voice');
      return true;
    }
    updateVoiceStatus('Listening', 'listening', `Heard: “${transcript}”. Say “Start ambulance alert”.`);
    return false;
  }

  function setupRecognition() {
    if (!SpeechRecognition) {
      elements.micButton.disabled = true;
      elements.micButtonText.textContent = 'Voice recognition unavailable';
      elements.demoButton.hidden = false;
      updateVoiceStatus('Unsupported', 'unsupported', 'Speech recognition is not supported here. Use the command button to simulate voice activation.');
      return;
    }
    recognition = new SpeechRecognition();
    recognition.lang = 'en-IN';
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.maxAlternatives = 3;
    recognition.onstart = () => {
      listening = true;
      elements.micButtonText.textContent = 'Listening… click to stop';
      updateVoiceStatus('Listening', 'listening', 'Say “Start ambulance alert” clearly.');
    };
    recognition.onresult = event => {
      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const result = event.results[index];
        const transcripts = Array.from(result).map(alternative => alternative.transcript);
        const match = transcripts.find(text => text.toLowerCase().replace(/[.!?,]/g, '').trim().includes(COMMAND));
        if (match) {
          handleTranscript(match);
          recognition.stop();
          return;
        }
        if (result.isFinal) handleTranscript(transcripts[0]);
      }
    };
    recognition.onerror = event => {
      listening = false;
      elements.micButtonText.textContent = 'Start listening';
      const message = event.error === 'not-allowed' ? 'Microphone permission was denied. Allow access and try again.' : `Speech recognition error: ${event.error}. Try again or use the command button.`;
      updateVoiceStatus('Ready', 'idle', message);
    };
    recognition.onend = () => {
      listening = false;
      if (!activated) {
        elements.micButtonText.textContent = 'Start listening';
        if (elements.voiceStatus.classList.contains('status-listening')) updateVoiceStatus('Ready', 'idle', 'Say “Start ambulance alert” or use the microphone.');
      }
    };
  }

  elements.micButton.addEventListener('click', () => {
    if (!recognition || activated) return;
    if (listening) recognition.stop();
    else {
      try { recognition.start(); }
      catch (error) { updateVoiceStatus('Ready', 'idle', 'Microphone is busy. Wait a moment and try again.'); }
    }
  });

  elements.demoButton.addEventListener('click', () => {
    const command = window.prompt('Type the voice command to simulate:');
    if (command === null) return;
    if (command.toLowerCase().replace(/[.!?,]/g, '').trim().includes(COMMAND)) activateSystem('typed command');
    else updateVoiceStatus('Command not recognized', 'idle', 'Enter “Start ambulance alert” to activate the simulation.');
  });

  if (!('speechSynthesis' in window)) {
    elements.speechNotice.textContent = 'Text-to-speech is unavailable in this browser. The warning will still appear on screen.';
  }
  setupRecognition();
  renderDashboard();
})();

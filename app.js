// VibePlayer - Audio Visualizer & Player Logic

document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const audio = document.getElementById('audioElement');
    const canvas = document.getElementById('visualizerCanvas');
    const ctx = canvas.getContext('2d');

    const playPauseBtn = document.getElementById('playPauseBtn');
    const playIcon = document.getElementById('playIcon');
    const pauseIcon = document.getElementById('pauseIcon');
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');

    const progressBar = document.getElementById('progressBar');
    const currentTimeEl = document.getElementById('currentTime');
    const durationTimeEl = document.getElementById('durationTime');

    const volumeBar = document.getElementById('volumeBar');
    const muteBtn = document.getElementById('muteBtn');
    const volHighIcon = document.getElementById('volHighIcon');
    const volMuteIcon = document.getElementById('volMuteIcon');

    const trackTitleEl = document.getElementById('trackTitle');
    const trackArtistEl = document.getElementById('trackArtist');
    const playlistTracksEl = document.getElementById('playlistTracks');
    const audioFileInput = document.getElementById('audioFileInput');
    const synthGenBtn = document.getElementById('synthGenBtn');

    const modeWaveBtn = document.getElementById('modeWaveBtn');
    const modeBarsBtn = document.getElementById('modeBarsBtn');
    const modeRadialBtn = document.getElementById('modeRadialBtn');
    const visualizerModeLabel = document.getElementById('visualizerModeLabel');

    // Web Audio Context & Analyser
    let audioCtx = null;
    let analyser = null;
    let sourceNode = null;
    let animationFrameId = null;
    let synthLoopInterval = null;
    let isSynthPlaying = false;
    let visualizerMode = 'waveform'; // 'waveform', 'bars', 'radial'

    // Default Playlist
    let playlist = [
        {
            title: 'Neon Synthwave Glow',
            artist: 'Procedural Synth Engine',
            isSynth: true,
            bpm: 110
        },
        {
            title: 'Purple Cosmic Pulse',
            artist: 'Procedural Synth Engine',
            isSynth: true,
            bpm: 124
        }
    ];

    let currentTrackIndex = 0;

    // Canvas Resizing
    function resizeCanvas() {
        const dpr = window.devicePixelRatio || 1;
        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        ctx.scale(dpr, dpr);
    }
    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();

    // Initialize Audio Context on User Interaction
    function initAudioContext() {
        if (!audioCtx) {
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            audioCtx = new AudioCtx();
            analyser = audioCtx.createAnalyser();
            analyser.fftSize = 2048;
            analyser.smoothingTimeConstant = 0.85;

            // Connect HTML5 Audio Element
            sourceNode = audioCtx.createMediaElementSource(audio);
            sourceNode.connect(analyser);
            analyser.connect(audioCtx.destination);
        }
        if (audioCtx.state === 'suspended') {
            audioCtx.resume();
        }
    }

    // Render Playlist UI
    function renderPlaylist() {
        playlistTracksEl.innerHTML = '';
        playlist.forEach((track, index) => {
            const li = document.createElement('li');
            li.className = `track-item ${index === currentTrackIndex ? 'active' : ''}`;
            li.innerHTML = `
                <div class="track-item-info">
                    <span class="track-item-title">${track.title}</span>
                    <span class="track-item-artist">${track.artist}</span>
                </div>
            `;
            li.addEventListener('click', () => {
                loadTrack(index);
                playAudio();
            });
            playlistTracksEl.appendChild(li);
        });
    }

    // Load Track
    function loadTrack(index) {
        currentTrackIndex = index;
        const track = playlist[currentTrackIndex];
        trackTitleEl.textContent = track.title;
        trackArtistEl.textContent = track.artist;
        renderPlaylist();

        stopSynthBeat();

        if (track.src) {
            audio.src = track.src;
            audio.load();
        } else if (track.isSynth) {
            audio.src = '';
            // Synth track setup
            currentTimeEl.textContent = '0:00';
            durationTimeEl.textContent = '∞';
        }
    }

    // Play/Pause Functions
    function playAudio() {
        initAudioContext();
        const track = playlist[currentTrackIndex];

        if (track.isSynth) {
            startSynthBeat(track.bpm || 115);
            playIcon.classList.add('hidden');
            pauseIcon.classList.remove('hidden');
        } else {
            audio.play().then(() => {
                playIcon.classList.add('hidden');
                pauseIcon.classList.remove('hidden');
            }).catch(e => console.error("Playback failed:", e));
        }
        startVisualizer();
    }

    function pauseAudio() {
        const track = playlist[currentTrackIndex];
        if (track.isSynth) {
            stopSynthBeat();
        } else {
            audio.pause();
        }
        playIcon.classList.remove('hidden');
        pauseIcon.classList.add('hidden');
    }

    playPauseBtn.addEventListener('click', () => {
        const track = playlist[currentTrackIndex];
        if (track.isSynth) {
            if (isSynthPlaying) pauseAudio();
            else playAudio();
        } else {
            if (audio.paused) playAudio();
            else pauseAudio();
        }
    });

    prevBtn.addEventListener('click', () => {
        currentTrackIndex = (currentTrackIndex - 1 + playlist.length) % playlist.length;
        loadTrack(currentTrackIndex);
        playAudio();
    });

    nextBtn.addEventListener('click', () => {
        currentTrackIndex = (currentTrackIndex + 1) % playlist.length;
        loadTrack(currentTrackIndex);
        playAudio();
    });

    // Time Formatting
    function formatTime(seconds) {
        if (isNaN(seconds)) return '0:00';
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
    }

    // Audio Event Listeners
    audio.addEventListener('timeupdate', () => {
        if (audio.duration) {
            const pct = (audio.currentTime / audio.duration) * 100;
            progressBar.value = pct;
            currentTimeEl.textContent = formatTime(audio.currentTime);
            durationTimeEl.textContent = formatTime(audio.duration);
        }
    });

    audio.addEventListener('ended', () => {
        nextBtn.click();
    });

    progressBar.addEventListener('input', () => {
        if (audio.duration) {
            audio.currentTime = (progressBar.value / 100) * audio.duration;
        }
    });

    // Volume Control
    volumeBar.addEventListener('input', () => {
        const val = volumeBar.value / 100;
        audio.volume = val;
        if (val === 0) {
            volHighIcon.classList.add('hidden');
            volMuteIcon.classList.remove('hidden');
        } else {
            volHighIcon.classList.remove('hidden');
            volMuteIcon.classList.add('hidden');
        }
    });

    muteBtn.addEventListener('click', () => {
        if (audio.volume > 0) {
            audio.dataset.prevVol = audio.volume;
            audio.volume = 0;
            volumeBar.value = 0;
            volHighIcon.classList.add('hidden');
            volMuteIcon.classList.remove('hidden');
        } else {
            const prev = audio.dataset.prevVol || 0.8;
            audio.volume = prev;
            volumeBar.value = prev * 100;
            volHighIcon.classList.remove('hidden');
            volMuteIcon.classList.add('hidden');
        }
    });

    // File Upload
    audioFileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const fileUrl = URL.createObjectURL(file);
            const newTrack = {
                title: file.name.replace(/\.[^/.]+$/, ""),
                artist: 'Local File',
                src: fileUrl,
                isSynth: false
            };
            playlist.unshift(newTrack);
            loadTrack(0);
            playAudio();
        }
    });

    // Procedural Synth Engine for instant play without external audio files
    function startSynthBeat(bpm) {
        initAudioContext();
        if (isSynthPlaying) stopSynthBeat();
        isSynthPlaying = true;

        const intervalMs = (60 / bpm / 4) * 1000; // 16th notes
        let step = 0;

        synthLoopInterval = setInterval(() => {
            if (!isSynthPlaying || !audioCtx) return;

            const time = audioCtx.currentTime;

            // Kick drum on beats 0, 4, 8, 12
            if (step % 4 === 0) {
                const osc = audioCtx.createOscillator();
                const gain = audioCtx.createGain();
                osc.type = 'sine';
                osc.frequency.setValueAtTime(130, time);
                osc.frequency.exponentialRampToValueAtTime(30, time + 0.12);
                gain.gain.setValueAtTime(0.8, time);
                gain.gain.exponentialRampToValueAtTime(0.001, time + 0.15);
                osc.connect(gain);
                gain.connect(analyser);
                osc.start(time);
                osc.stop(time + 0.15);
            }

            // Snare on beats 4, 12
            if (step % 8 === 4) {
                const bufferSize = audioCtx.sampleRate * 0.1;
                const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
                const data = buffer.getChannelData(0);
                for (let i = 0; i < bufferSize; i++) {
                    data[i] = Math.random() * 2 - 1;
                }
                const noise = audioCtx.createBufferSource();
                noise.buffer = buffer;
                const gain = audioCtx.createGain();
                gain.gain.setValueAtTime(0.35, time);
                gain.gain.exponentialRampToValueAtTime(0.01, time + 0.1);
                noise.connect(gain);
                gain.connect(analyser);
                noise.start(time);
            }

            // Synth bass / melody
            const bassNotes = [55, 55, 65, 55, 49, 55, 65, 73];
            const noteFreq = bassNotes[step % bassNotes.length];
            const synthOsc = audioCtx.createOscillator();
            const synthGain = audioCtx.createGain();
            const filter = audioCtx.createBiquadFilter();

            synthOsc.type = 'sawtooth';
            synthOsc.frequency.setValueAtTime(noteFreq * 2, time);

            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(400 + Math.sin(step * 0.5) * 350, time);

            synthGain.gain.setValueAtTime(0.2, time);
            synthGain.gain.exponentialRampToValueAtTime(0.005, time + 0.12);

            synthOsc.connect(filter);
            filter.connect(synthGain);
            synthGain.connect(analyser);

            synthOsc.start(time);
            synthOsc.stop(time + 0.14);

            step++;
        }, intervalMs);
    }

    function stopSynthBeat() {
        isSynthPlaying = false;
        if (synthLoopInterval) {
            clearInterval(synthLoopInterval);
            synthLoopInterval = null;
        }
    }

    synthGenBtn.addEventListener('click', () => {
        const synthTrack = playlist.find(t => t.isSynth);
        if (synthTrack) {
            const idx = playlist.indexOf(synthTrack);
            loadTrack(idx);
            playAudio();
        }
    });

    // Mode Switchers
    modeWaveBtn.addEventListener('click', () => setMode('waveform'));
    modeBarsBtn.addEventListener('click', () => setMode('bars'));
    modeRadialBtn.addEventListener('click', () => setMode('radial'));

    function setMode(mode) {
        visualizerMode = mode;
        [modeWaveBtn, modeBarsBtn, modeRadialBtn].forEach(btn => btn.classList.remove('active'));
        if (mode === 'waveform') {
            modeWaveBtn.classList.add('active');
            visualizerModeLabel.textContent = 'Waveform Mode';
        } else if (mode === 'bars') {
            modeBarsBtn.classList.add('active');
            visualizerModeLabel.textContent = 'Spectrum Mode';
        } else if (mode === 'radial') {
            modeRadialBtn.classList.add('active');
            visualizerModeLabel.textContent = 'Radial Mode';
        }
    }

    // CANVAS VISUALIZER DRAW LOOP
    function startVisualizer() {
        if (animationFrameId) cancelAnimationFrame(animationFrameId);

        function draw() {
            animationFrameId = requestAnimationFrame(draw);

            const rect = canvas.getBoundingClientRect();
            const width = rect.width;
            const height = rect.height;

            ctx.clearRect(0, 0, width, height);

            if (!analyser) {
                // Idle ambient line
                ctx.beginPath();
                ctx.moveTo(0, height / 2);
                ctx.lineTo(width, height / 2);
                ctx.strokeStyle = 'rgba(255, 42, 133, 0.3)';
                ctx.lineWidth = 2;
                ctx.stroke();
                return;
            }

            if (visualizerMode === 'waveform') {
                const bufferLength = analyser.fftSize;
                const dataArray = new Uint8Array(bufferLength);
                analyser.getByteTimeDomainData(dataArray);

                ctx.lineWidth = 2.5;
                const gradient = ctx.createLinearGradient(0, 0, width, 0);
                gradient.addColorStop(0, '#ff2a85');
                gradient.addColorStop(0.5, '#a855f7');
                gradient.addColorStop(1, '#38bdf8');
                ctx.strokeStyle = gradient;

                ctx.shadowBlur = 12;
                ctx.shadowColor = '#ff2a85';

                ctx.beginPath();
                const sliceWidth = width / bufferLength;
                let x = 0;

                for (let i = 0; i < bufferLength; i++) {
                    const v = dataArray[i] / 128.0;
                    const y = (v * height) / 2;

                    if (i === 0) ctx.moveTo(x, y);
                    else ctx.lineTo(x, y);

                    x += sliceWidth;
                }

                ctx.lineTo(width, height / 2);
                ctx.stroke();
                ctx.shadowBlur = 0;

            } else if (visualizerMode === 'bars') {
                const bufferLength = analyser.frequencyBinCount;
                const dataArray = new Uint8Array(bufferLength);
                analyser.getByteFrequencyData(dataArray);

                const barCount = 38;
                const barWidth = (width / barCount) - 3;
                let x = 0;

                for (let i = 0; i < barCount; i++) {
                    const barHeight = (dataArray[i * 2] / 255) * (height * 0.82);

                    const grad = ctx.createLinearGradient(0, height, 0, height - barHeight);
                    grad.addColorStop(0, 'rgba(168, 85, 247, 0.2)');
                    grad.addColorStop(0.6, '#ff2a85');
                    grad.addColorStop(1, '#f472b6');

                    ctx.fillStyle = grad;
                    ctx.shadowBlur = 8;
                    ctx.shadowColor = '#ff2a85';

                    // Rounded top bars
                    const barY = height - barHeight;
                    ctx.beginPath();
                    ctx.roundRect(x, barY, barWidth, barHeight, [4, 4, 0, 0]);
                    ctx.fill();

                    x += barWidth + 3;
                }
                ctx.shadowBlur = 0;

            } else if (visualizerMode === 'radial') {
                const bufferLength = analyser.frequencyBinCount;
                const dataArray = new Uint8Array(bufferLength);
                analyser.getByteFrequencyData(dataArray);

                const centerX = width / 2;
                const centerY = height / 2;
                const baseRadius = Math.min(width, height) * 0.25;

                const bars = 48;
                const step = (Math.PI * 2) / bars;

                ctx.shadowBlur = 15;
                ctx.shadowColor = '#a855f7';

                for (let i = 0; i < bars; i++) {
                    const val = dataArray[i * 2] / 255;
                    const radLen = baseRadius + val * 45;

                    const angle = i * step;
                    const x1 = centerX + Math.cos(angle) * baseRadius;
                    const y1 = centerY + Math.sin(angle) * baseRadius;
                    const x2 = centerX + Math.cos(angle) * radLen;
                    const y2 = centerY + Math.sin(angle) * radLen;

                    const grad = ctx.createLinearGradient(x1, y1, x2, y2);
                    grad.addColorStop(0, '#a855f7');
                    grad.addColorStop(1, '#ff2a85');

                    ctx.strokeStyle = grad;
                    ctx.lineWidth = 3;
                    ctx.beginPath();
                    ctx.moveTo(x1, y1);
                    ctx.lineTo(x2, y2);
                    ctx.stroke();
                }

                // Inner core ring
                ctx.beginPath();
                ctx.arc(centerX, centerY, baseRadius - 2, 0, Math.PI * 2);
                ctx.strokeStyle = 'rgba(255, 42, 133, 0.6)';
                ctx.lineWidth = 1.5;
                ctx.stroke();

                ctx.shadowBlur = 0;
            }
        }

        draw();
    }

    // Initialize
    loadTrack(0);
    startVisualizer();
});

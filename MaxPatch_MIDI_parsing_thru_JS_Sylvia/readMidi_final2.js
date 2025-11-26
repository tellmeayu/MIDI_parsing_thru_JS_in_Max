const fs = require('fs');  // fs module, file system
const MidiFile = require('midi-file');
const Max = require('max-api');

// MIDI instru list
const midiInstruments = [
    "acoustic grand piano", "bright acoustic piano", "electric grand piano", "honky-tonk piano",
    "electric piano 1", "electric piano 2", "harpsichord", "clavinet", "celesta", "glockenspiel",
    "music box", "vibraphone", "marimba", "xylophone", "tubular bells", "dulcimer", "drawbar organ",
    "percussive organ", "rock organ", "church organ", "reed organ", "accordion", "harmonica",
    "tango accordion", "acoustic guitar (nylon)", "acoustic guitar (steel)", "electric guitar (jazz)",
    "electric guitar (clean)", "electric guitar (muted)", "overdriven guitar", "distortion guitar",
    "guitar harmonics", "acoustic bass", "electric bass (finger)", "electric bass (pick)", "fretless bass",
    "slap bass 1", "slap bass 2", "synth bass 1", "synth bass 2", "violin", "viola", "cello", "contrabass",
    "tremolo strings", "pizzicato strings", "orchestral harp", "timpani", "string ensemble 1",
    "string ensemble 2", "synth strings 1", "synth strings 2", "choir aahs", "voice oohs", "synth voice",
    "orchestra hit", "trumpet", "trombone", "tuba", "muted trumpet", "french horn", "brass section",
    "synth brass 1", "synth brass 2", "soprano sax", "alto sax", "tenor sax", "baritone sax", "oboe",
    "english horn", "bassoon", "clarinet", "piccolo", "flute", "recorder", "pan flute", "blown bottle",
    "shakuhachi", "whistle", "ocarina", "lead 1 (square)", "lead 2 (sawtooth)", "lead 3 (calliope)",
    "lead 4 (chiff)", "lead 5 (charang)", "lead 6 (voice)", "lead 7 (fifths)", "lead 8 (bass + lead)",
    "pad 1 (new age)", "pad 2 (warm)", "pad 3 (polysynth)", "pad 4 (choir)", "pad 5 (bowed)",
    "pad 6 (metallic)", "pad 7 (halo)", "pad 8 (sweep)", "fx 1 (rain)", "fx 2 (soundtrack)",
    "fx 3 (crystal)", "fx 4 (atmosphere)", "fx 5 (brightness)", "fx 6 (goblins)", "fx 7 (echoes)",
    "fx 8 (sci-fi)", "sitar", "banjo", "shamisen", "koto", "kalimba", "bag pipe", "fiddle",
    "shanai", "tinkle bell", "agogo", "steel drums", "woodblock", "taiko drum", "melodic tom",
    "synth drum", "reverse cymbal", "guitar fret noise", "breath noise", "seashore", "bird tweet",
    "telephone ring", "helicopter", "applause", "gunshot"
];

// get instrument name by prog no.
function getInstrumentName(programNumber) {
    return midiInstruments[programNumber] || "unknown instrument";
}

// convert tempo to bpm (60 sec == 60,000,000 microsec)
function tempoToBpm(tempo) {
    return 60000000 / tempo;
}

// read and parse the input midi file
function readMidi(filePath) {
    try {
        Max.post(`Attempting to read MIDI file: ${filePath}`);

        const input = fs.readFileSync(filePath);
        Max.post('MIDI file read successfully.');

        const parsed = MidiFile.parseMidi(input);
        Max.post('MIDI file parsed successfully.');
        
        // Header Chunck: time resolution & tracks number
        const ppq = parsed.header.ticksPerBeat;
        const numOfTracks = parsed.header.numTracks;

        // Tracks Chunck:
        const trackEvents = {};       // events for each track
        const trackInstruments = {};  // program changes for each track

        let finalTicks = 0;           // initilize track end
        let bpm = null;

        parsed.tracks.forEach((track, trackIndex) => {
            trackEvents[trackIndex] = [];
            trackInstruments[trackIndex] = {};
            let currentTime = 0;
            const activeNotes = {};

            track.forEach(event => {
                currentTime += event.deltaTime;

                if (event.type === 'programChange') {
                    trackInstruments[trackIndex][event.channel] = event.programNumber;
                }                                                // program change

                if (event.type === 'setTempo' && bpm === null) {
                    bpm = tempoToBpm(event.microsecondsPerBeat);    // 60M/mic_per_4n
                }

                if (event.type === 'noteOn') {
                    const noteKey = `${trackIndex}-${event.channel}-${event.noteNumber}`;
                    activeNotes[noteKey] = {
                        track: trackIndex,
                        type: 'noteOn',
                        pitch: event.noteNumber,
                        velocity: event.velocity,
                        startTime: currentTime,
                        channel: event.channel,
                    };
                } else if ((event.type === 'noteOff' || (event.type === 'noteOn' && event.velocity === 0))) {
                    const noteKey = `${trackIndex}-${event.channel}-${event.noteNumber}`;

                    if (activeNotes[noteKey]) {                    // if the active note exists
                        const noteOn = activeNotes[noteKey];
                        const duration = currentTime - noteOn.startTime;
                        trackEvents[trackIndex].push({       // append note info after note-off
                            track: trackIndex,
                            type: 'noteEvent',
                            pitch: noteOn.pitch,                 // retrieves corresponding note-on info
                            velocity: noteOn.velocity,
                            startTime: noteOn.startTime,
                            duration: duration,
                            channel: noteOn.channel,
                        });
                        delete activeNotes[noteKey];
                    }
                }
            });

            finalTicks = Math.max(finalTicks, currentTime);   // calcu endTick after a track's been looped
        });
        
        // customized functions for global information
        outputBpm(bpm);
        outputFinalTicks(finalTicks);
        outputPpq(ppq);
        outputNumOfTracks(numOfTracks);
        outputTrackEvents(trackEvents, trackInstruments);

    } catch (error) {
        Max.outlet('note', `Error reading MIDI file: ${error.message}`);
    }
}

     // for global information
    function outputBpm(bpm) {
        if (bpm !== null) {
            Max.outlet('bpm', bpm);
        } else {
            Max.outlet('bpm', 'No BPM found, defaulting to 120');
        }
    }

    function outputFinalTicks(finalTicks) {
        Max.outlet('endTick', finalTicks);
    }

    function outputPpq(ppq) {
        Max.outlet('ppq', ppq);
    }

    function outputNumOfTracks(numOfTracks) {
        Max.outlet('Tracks', numOfTracks);
    }

    function outputTrackEvents(trackEvents, trackInstruments) {
        Object.keys(trackEvents).forEach(trackIndex => {
            trackEvents[trackIndex].forEach(event => {
                const instrument = getInstrumentName(trackInstruments[trackIndex][event.channel]);
                Max.outlet('note', event.track, instrument, event.type, event.pitch, event.velocity, event.startTime, event.duration, event.channel);
            });
        });
    }

    Max.addHandler('readMidiFile', (filePath) => {
        readMidi(filePath);
    });

# MIDI_parsing_thru_JS_in_Max
MIDI parsing in Max is quite limited so I wrote a JavaScript to do the job. Using [node.script] in Max, the MIDI information could be fully parsed.
Each track's note events will be stored in seperate [coll] object. 
Theoretically, the track number of the MIDI file has no limit, the current patch shows 8 track collection as an example.
I hope the idea of using Node to parse MIDI in Max could be helpful for Max users.
**The project has been recognized and featured on Cycling'74 User Project website** - https://cycling74.com/projects/midi-parsing-using-javascript-in-max 
Author's note and technique memo: https://www.sylviastudio.cn/midi-parsing-thru-javascript-in-max/
![](https://www.sylviastudio.cn/wp-content/uploads/2025/11/Screenshot-2025-11-26-at-09.45.21.png)

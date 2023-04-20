import { IRoute } from '@aurelia/router';
import { Data } from './data';

import { inject } from 'aurelia';

@inject(Data)
export class Main {
    /* Routing HAS to be inside this class -- no choice */
    static routes: IRoute[] = [
        {
            path: ["", "tree"],
            title: "tree",
            component: import("./dashboard/tree/tree"),
        },
        {
            path: ["other"],
            title: "other",
            component: import("./dashboard/other/other"),
        },
    ]

    private data: Data;

    constructor(data: Data) {
        this.data = data;
        window.addEventListener("keydown", this.keyPressHandler.bind(this));
    }

    dispose() {
        window.removeEventListener("keydown", this.keyPressHandler.bind(this))
    }

    /*
      right-arrow - move forward one event
      left-arrow - move backward one event
      up-arrow - move forward to next checkpoint
      down-arrow - move backward to last checkpoint
      spacebar - replay
    */
    keyPressHandler(event: KeyboardEvent) {

        // Don't handle keypresses inside input fields
        //  BUT -- allow sliders to be handled
        if ((event.target as HTMLInputElement).type == "text") return;

        switch (event.key) {
            case "ArrowRight":
                if (this.data.playback >= this.data.codeStates.length - 1) break;
                this.data.playback += 1; break;

            case "ArrowLeft":
                if (this.data.playback <= 0) break;
                this.data.playback -= 1; break;

            case "ArrowUp":
                console.log(event);
                break;

            case "ArrowDown":
                console.log(event);
                break;

            case " ":
                this.data.playbackEnabled = !this.data.playbackEnabled;
                break;

            // If we do not want to handle the keypress, get out of here!
            default:
                return;
        }

        event.preventDefault();  // prevent handled keys from doing something else
    }
}
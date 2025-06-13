//https://stackoverflow.com/questions/13640061/get-a-list-of-all-currently-pressed-keys-in-javascript
export var pressedKeys = {};
window.onkeyup = function(e) { pressedKeys[e.key] = false;};
window.onkeydown = function(e) { pressedKeys[e.key] = true;}



const ModalDialog = imports.ui.modalDialog;
const Lang = imports.lang;
const St = imports.gi.St;

const Extension = imports.misc.extensionUtils.getCurrentExtension();
const debug = Extension.imports.utils.debug;

const MAX_LENGTH = 75;
const KEY_RETURN = 65293;
const KEY_ENTER  = 65421;



// TodoList object
function RenameDialog(name){
    this.conn = null;
    this._init(name);
}

RenameDialog.prototype = {
    __proto__ : ModalDialog.ModalDialog.prototype,
    _init: function(name){
        ModalDialog.ModalDialog.prototype._init.call(this);
        this.renameEntry = new St.Entry({
            name: "renameEntry",
            text: _(name),
            hint_text: _(name),
            track_hover: true,
            can_focus: true,
        });
        this.callback = function(text){
            debug('Whatever action! ' + text);
        }
        let entry = this.renameEntry.clutter_text;
        entry.set_text(name);
        entry.set_max_length(MAX_LENGTH);
        entry.connect('key-press-event', Lang.bind(this, function(o,e)
        {
            let symbol = e.get_key_symbol();
            if (symbol == KEY_RETURN || symbol == KEY_ENTER)
            {
                this.callback(o.get_text());
                this.close();
            }
        }));
        this.contentLayout.add_actor(this.renameEntry);
        var ok_button = {
            'label': 'Ok',
            'action': Lang.bind(this, function(o, e){
                this.callback(this.renameEntry.clutter_text.get_text());
                this.close();
            }),
            'default': true,
        };
        var cancel_button = {
            'label': 'Cancel',
            'action': Lang.bind(this, function(o, e){
                this.close();
            }),
            'default': true,
        };
        this.setButtons([ok_button, cancel_button]);
        this.setInitialKeyFocus(this.renameEntry);
        debug('' + this._initialKeyFocus)
        this.connect('opened', Lang.bind(this, function(){
            debug('grab focus!!!!!!!!!!!!!!!!!');
            this.renameEntry.grab_key_focus();
        }));
    },
    set_callback: function(_callback){
        this.callback = _callback;
    }
}
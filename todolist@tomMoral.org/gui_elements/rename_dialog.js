
const ModalDialog = imports.ui.modalDialog;
const Lang = imports.lang;
const St = imports.gi.St;

const Extension = imports.misc.extensionUtils.getCurrentExtension();
const debug = Extension.imports.utils.debug;

const Gettext = imports.gettext.domain('todolist');
const _ = Gettext.gettext;

const MAX_LENGTH = 75;
const KEY_RETURN = 65293;
const KEY_ENTER  = 65421;



// Rename dialog object
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
            text: name,
            hint_text: name,
            track_hover: true,
            can_focus: true,
        });
        this.callback = function(text){
            debug('No callback??');
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
            'label': _("Ok"),
            'action': Lang.bind(this, function(o, e){
                this.callback(this.renameEntry.clutter_text.get_text());
                this.close();
            }),
            'default': true,
        };
        var cancel_button = {
            'label': _("Cancel"),
            'action': Lang.bind(this, function(o, e){
                this.close();
            }),
            'default': true,
        };
        this.setButtons([ok_button, cancel_button]);
        this.setInitialKeyFocus(this.renameEntry);
        this.connect('opened', Lang.bind(this, function(){
            debug('Rename dialog grab focus');
            this.renameEntry.grab_key_focus();
        }));
    },
    set_callback: function(_callback){
        this.callback = _callback;
    }
}
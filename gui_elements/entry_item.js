
const PopupMenu = imports.ui.popupMenu;
const St = imports.gi.St;
const Gettext = imports.gettext.domain('gnome-shell');
const Lang = imports.lang;
const Gio = imports.gi.Gio;
const _ = Gettext.gettext;


const Extension = imports.misc.extensionUtils.getCurrentExtension();
const debug = Extension.imports.utils.debug;

const MAX_LENGTH = 75;
const KEY_RETURN = 65293;
const KEY_ENTER  = 65421;

// Read more: http://blog.fpmurphy.com/2011/04/replace-gnome-shell-activities-text-string-with-icon.html#ixzz3ndrA3Jrl



// TodoList object
function EntryItem(){
    this.conn = null;
    this._init();
}

EntryItem.prototype = {
    __proto__ : PopupMenu.PopupBaseMenuItem.prototype,
    _init: function(){
        PopupMenu.PopupBaseMenuItem.prototype._init.call(this);
        this.actor.add_style_class_name('task-entry');
        // Text entry
        this.newTask = new St.Entry({
            name: "newTaskEntry",
            hint_text: _("New task..."),
            track_hover: true,
            can_focus: true
        });
        this.ENT = this.newTask.clutter_text;
        this.ENT.set_max_length(MAX_LENGTH);
        // Call back to add section when ENTER is press
        this.conn_ENT = this.ENT.connect('key-press-event', Lang.bind(this,function(o, e){
            let symbol = e.get_key_symbol();
            if (symbol == KEY_RETURN || symbol == KEY_ENTER){
                debug("Add entry "+ o.get_text())
                this.emit('new_task', o.get_text());
                o.set_text('');
            }
        }));
        this.actor.add_actor(this.newTask);
    },
    _destroy: function(){
        this.ENT.disconnect(this.conn_ENT);
    },
    isEntry: function(){
        return true;
    }

}
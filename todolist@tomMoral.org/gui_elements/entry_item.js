// Standard imports
const St = imports.gi.St;
const Lang = imports.lang;
const Gio = imports.gi.Gio;
const Clutter = imports.gi.Clutter;
const PopupMenu = imports.ui.popupMenu;

// Extension import: rename dialog and util.debug
const Extension = imports.misc.extensionUtils.getCurrentExtension();
const debug = Extension.imports.utils.debug;

// Define the functions needed for translation purpose
const Gettext = imports.gettext.domain('todolist');
const _ = Gettext.gettext;

const MAX_LENGTH = 75;

// Read more: http://blog.fpmurphy.com/2011/04/replace-gnome-shell-activities-text-string-with-icon.html#ixzz3ndrA3Jrl


// TodoList object
class EntryItem extends PopupMenu.PopupBaseMenuItem{
    constructor()
    {
        // Call base constructor and set style_class_name
        super();
        this.actor.add_style_class_name('task-entry');

        // Add a text entry in the BaseMenuItem layout
        this.newTask = new St.Entry({
            name: "newTaskEntry",
            hint_text: _("New task..."),
            track_hover: true,
            can_focus: true
        });
        this.ENT = this.newTask.clutter_text;
        this.ENT.set_max_length(MAX_LENGTH);
        // Call back to add section when ENTER is press
        this.connection_ENT = this.ENT.connect(
            'key-press-event', Lang.bind(this, this._on_keypress_event));
        this.actor.add_actor(this.newTask);
    }
    destroy()
    {
        this.ENT.disconnect(this.connection_ENT);
        PopupMenu.PopupBaseMenuItem.prototype.destroy.call(this);
    }
    isEntry()
    {
        return true;
    }
    _on_keypress_event(entry, event)
    {
        // If the key press is Enter or Return,
        // add the new task to the todolist
        let symbol = event.get_key_symbol();
        if (symbol == Clutter.KEY_Return ||
            symbol == Clutter.KEY_KP_Enter)
        {
            this.emit('new_task', entry.get_text());
            entry.set_text('');
        }
    }
}
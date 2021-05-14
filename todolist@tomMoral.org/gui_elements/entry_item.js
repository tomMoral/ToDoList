// Standard imports
const St = imports.gi.St;
const Lang = imports.lang;
const Gio = imports.gi.Gio;
const Clutter = imports.gi.Clutter;
const GObject = imports.gi.GObject;
const PopupMenu = imports.ui.popupMenu;

// Extension import: rename dialog and util.debug
const Extension = imports.misc.extensionUtils.getCurrentExtension();
const debug = Extension.imports.utils.debug;

// Define the functions needed for translation purpose
const Gettext = imports.gettext.domain('todolist');
const _ = Gettext.gettext;

const MAX_LENGTH = 75;

// Read more: http://blog.fpmurphy.com/2011/04/replace-gnome-shell-activities-text-string-with-icon.html#ixzz3ndrA3Jrl


// EntryItem object
var EntryItem = class EntryItem extends GObject.Object {
    _init()
    {
        super._init();
        this.menu_item = new PopupMenu.PopupBaseMenuItem()
        // Call base constructor and set style_class_name
        this.menu_item.actor.add_style_class_name('task-entry');

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
        this.menu_item.actor.add_actor(this.newTask);
    }
    destroy()
    {
        this.ENT.disconnect(this.connection_ENT);
        PopupMenu.PopupBaseMenuItem.prototype.destroy.call(this.menu_item);
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


// In gnome-shell >= 3.32 this class and several others became GObject
// subclasses. We can account for this change in a backwards-compatible way
// simply by re-wrapping our subclass in `GObject.registerClass()`
EntryItem = GObject.registerClass(
    {
        GTypeName: 'Todolist_EntryItem',
        Extends: GObject.Object,
        Signals: {
            'new_task': {
                param_types: [GObject.TYPE_STRING]
            }
        }
    },
    EntryItem
);

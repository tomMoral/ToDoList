// Standard imports
const St = imports.gi.St;
const Lang = imports.lang;
const Gio = imports.gi.Gio;
const GLib = imports.gi.GLib;
const Clutter = imports.gi.Clutter;
const GObject = imports.gi.GObject;
const PopupMenu = imports.ui.popupMenu;

// Extension import: rename dialog and util.debug
const Extension = imports.misc.extensionUtils.getCurrentExtension();
const RenameDialog = Extension.imports.gui_elements.rename_dialog.RenameDialog;
const debug = Extension.imports.utils.debug;

// Define the functions needed for translation purpose
const Gettext = imports.gettext.domain('todolist');
const _ = Gettext.gettext;

// Load the icon used to delete button
const GTK_CLOSE_ICON = Gio.icon_new_for_string(
    Extension.path + "/icons/gtk-close.png");

// TaskItem object wrapper
var TaskItem = class TaskItem extends GObject.Object {
    _init(task){
        super._init();
        this.task = task;
        this.connections = []
        this.menu_item = new PopupMenu.PopupBaseMenuItem();

        // Set layout manager
        this.menu_item.actor.add_style_class_name('task-item');
        this.menu_item.actor.set_y_expand(true);
        this.menu_item.actor.set_layout_manager(new Clutter.BoxLayout());

        // Add an editable label to the layout to display the task
        this._label = new St.Entry({
            style_class: 'task-label',
            text: this.task.name,
            can_focus: true
        });
        this.menu_item.actor.add_actor(this._label);

        // Create connection for rename and clicks
        let _ct = this._label.clutter_text;
        _ct.set_line_wrap(true);
        let conn = _ct.connect('button_release_event', Lang.bind(this, this._clicked));
        this.connections.push([_ct, conn]);
        conn = _ct.connect('key_focus_out', Lang.bind(this, this._rename));
        this.connections.push([_ct, conn]);

        // Add a delete button for each item and connect it to
        this._del_btn = new St.Button({
            style_class: 'task-supr',
            label: ''
        });
        let logo = new St.Icon({icon_size: 10, gicon: GTK_CLOSE_ICON});
        this._del_btn.add_actor(logo);
        this.menu_item.actor.add_actor(this._del_btn);

        // Create connection for delete button
        conn = this._del_btn.connect('clicked',  Lang.bind(this, this._emit_delete));
        this.connections.push([this._del_btn, conn]);

    }
    destroy(){
        for (var connection of this.connections.reverse()){
            connection[0].disconnect(connection[1]);
        }
        this.connections.length = 0;
        this.menu_item.actor.destroy();
    }
    isEntry(){
        return false;
    }
    _emit_delete (){
        debug('yo')
        debug(this.task)
        this.emit('supr_signal', JSON.stringify(this.task));
        this.destroy();
    }
    _clicked (actor, ev){
        // Add rename on double click
        if (ev.get_click_count() == 2)
            debug("Double click");
    }
    _rename (){
        // Rename the task and notify the todolist so
        // it is updated.
        var name = this._label.get_text();

        // Return if the name did not changed or is not set
        if(name == this.task.name || name.length == 0)
            return;

        // Emit signal so todolist clean up
        debug("Rename task " + this.task.name + " to " + name);
        this.task.name = name;
        this.emit('name_changed');
    }
}



// In gnome-shell >= 3.32 this class and several others became GObject
// subclasses. We can account for this change in a backwards-compatible way
// simply by re-wrapping our subclass in `GObject.registerClass()`
TaskItem = GObject.registerClass(
    {
        GTypeName: 'Todolist_TaskItem',
        Extends: GObject.Object,
        Signals: {
            'name_changed': {},
            'supr_signal': {param_types: [GObject.TYPE_STRING]},
        },
    },
    TaskItem
);

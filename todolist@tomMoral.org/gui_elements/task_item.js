// Standard imports
const St = imports.gi.St;
const Lang = imports.lang;
const Gio = imports.gi.Gio;
const GLib = imports.gi.GLib;
const Clutter = imports.gi.Clutter;
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
function TaskItem(task){
    this.conn = null;
    this._init(task);
}

TaskItem.prototype = {
    // inherit from a PopupBaseMenuItem
    __proto__ : PopupMenu.PopupBaseMenuItem.prototype,
    _init: function(task){
        PopupMenu.PopupBaseMenuItem.prototype._init.call(this);
        this.task = task;

        // Set layout manager
        this.actor.add_style_class_name('task-item');
        this.actor.set_y_expand(true);
        this.actor.set_layout_manager(new Clutter.BoxLayout());

        // Add a Label to the layout to display the task
        this._label = new St.Label({ 
            style_class: 'task-label', 
            text: this.task.name
        });
        this._label.set_y_expand(true);
        this.connection_clik = this.actor.connect(
            'event', Lang.bind(this, this._clicked)
        );
        this.actor.add_actor(this._label);

        // Add a delete button for each item and connect it to 
        this._del_btn = new St.Button({
            style_class: 'task-supr',
            label: ''
        });
        let logo = new St.Icon({icon_size: 10, gicon: GTK_CLOSE_ICON});
        this._del_btn.add_actor(logo);
        this.connection_del = this._del_btn.connect(
            'clicked',  Lang.bind(this, this._emit_delete)
        );
        this.actor.add_actor(this._del_btn);

    },
    destroy: function(){
        this._del_btn.disconnect(this.connection_del);
        this._label.disconnect(this.connection_click);
        this.actor.destroy();
    },
    isEntry: function(){
        return false;
    },
    _emit_delete : function(){
        this.emit('supr_signal', this.task);
        this.destroy();
    },
    _clicked : function(actor, ev){
        // Check that the event is a click as all events
        // are redirected to this slot.
        if(ev.type() != Clutter.EventType.BUTTON_RELEASE)
            return;

        // Add rename on double click
        if (ev.get_click_count() == 2){
            this._getTopMenu().close();
            let mod = new RenameDialog(this.task.name);
            mod.set_callback(Lang.bind(this, this._rename));
            mod.open();
        }
        else if (this.task.file != null) {
            // On single click for project tasks, open the TODO
            // in a text editor at the right line.
            GLib.spawn_command_line_sync(
                "subl3 " + this.task.file
                + ":" + this.task.line);
        }
    },
    _rename : function(name){
        // Rename the task and notify the todolist so
        // the todolist is updated.
        if(name == this.task.name || name.length == 0){
            return;
        }

        // Emit signal so todolist clean up
        this.task.name = name;
        this.emit('name_changed');

        // Change the class variables
        this._label.set_text(name);

    }
}
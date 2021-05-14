
const St = imports.gi.St;
const Lang = imports.lang;
const Gio = imports.gi.Gio;
const GLib = imports.gi.GLib;
const Shell = imports.gi.Shell;
const GObject = imports.gi.GObject;
const PopupMenu = imports.ui.popupMenu;
const ModalDialog = imports.ui.modalDialog;

const Extension = imports.misc.extensionUtils.getCurrentExtension();
const TaskItem = Extension.imports.gui_elements.task_item;
const EntryItem = Extension.imports.gui_elements.entry_item.EntryItem;
const RenameDialog = Extension.imports.gui_elements.rename_dialog.RenameDialog;
const debug = Extension.imports.utils.debug;

const Gettext = imports.gettext.domain('todolist');
const _ = Gettext.gettext;

const BASE_TASKS = "";
const KEY_DELETE = 65535;

const GTK_CLOSE_ICON = Gio.icon_new_for_string(Extension.path + "/icons/gtk-close.png");

// Read more: http://blog.fpmurphy.com/2011/04/replace-gnome-shell-activities-text-string-with-icon.html#ixzz3ndrA3Jrl



// Section of the todolist object
var SectionItem = class SectionItem extends GObject.Object {
    _init(section){
        super._init();
        this.section = section;
        this.menu_item = new PopupMenu.PopupSubMenuMenuItem(section.name);

        debug("Got section with name: " + section.name);
        this.id = section.id;
        this.name = section.name;
        this.tasks = section.tasks;

        // Fill section from the associated file
        this.n_tasks = 0;
        this.metaConn = [];
        this.connections = [];

        // Add an editable label to display the section title
        this._label = new St.Entry({
            style_class: 'task-label',
            text: this.section.name,
            can_focus: true
        });
        // add our label by replacing the default label in PopupSubMenuMenuItem
        this.menu_item.actor.add_child(this._label);
        this.menu_item.actor.set_child_above_sibling(
            this._label, this.menu_item.label);
        this.menu_item.actor.remove_actor(this.menu_item.label);
        this.menu_item.label.destroy();

        // Create connection for rename and clicks
        let _ct = this._label.clutter_text;
        let conn = _ct.connect('key_focus_out', Lang.bind(this, this._rename));
        this.connections.push([_ct, conn]);

        // Add a delete button that will be showed if there is no more task in
        // the section.
        this.delete_btn = new St.Button({ style_class: 'sec_supr', label:''});
        let logo = new St.Icon({icon_size: 12, gicon: GTK_CLOSE_ICON,
                                style_class: 'icon_sec'});
        this.delete_btn.add_actor(logo);
        this.menu_item.actor.add_actor(this.delete_btn);
        // Create connection for delete button
        conn = this.delete_btn.connect('clicked', Lang.bind(this, this._supr_call));
        this.connections.push([this.delete_btn, conn]);

        // Draw the section
        this._draw_section();
    }
    destroy(){
        this.connections.length = 0;
        // this.menu_item.disconnectAll();
        debug("All disconnected")

        // Remove all sub items
        if (this.entry_task != null)
            this.entry_task.destroy();
        this.menu_item.actor.destroy();

        debug("Section clean-up done")
    }
    _draw_section() {
        this._clear();

        // Initiate the task count
        this.n_tasks = 0;

        // Add tasks item in the section
        for(var i=0; i < this.tasks.length; i++)
            this._add_task(i);

        // Update the title of the section with the right task count
        // and notify the todolist applet if this count changed.
        this._set_text();

        // If there is no task in the section,show the delete button.
        if(this.n_tasks == 0)
            this.delete_btn.show();

        // Add the a EntryItem to allow adding new tasks in this section.
        let entry_task = new EntryItem();
        let conn = entry_task.connect('new_task', Lang.bind(this, this._create_task));
        this.connections.push([entry_task, conn])
        this.menu_item.menu.addMenuItem(entry_task.menu_item);
    }
    _add_task (i)
    {
        // Create a task item and set its callback
        let taskItem = new TaskItem.TaskItem(this.section.tasks[i]);

        // connect the signals to
        let conn = taskItem.connect('name_changed', Lang.bind(this, this._dump));
        this.connections.push([taskItem, conn])
        conn = taskItem.connect('supr_signal', Lang.bind(this, this._remove_task));
        this.connections.push([taskItem, conn])

        // Add the task to the section
        this.menu_item.menu.addMenuItem(taskItem.menu_item, i);
        this.n_tasks ++;

        // If it is the first task added, hide the delete
        // button for the section.
        if(this.n_tasks == 1)
            this.delete_btn.hide();

    }
    _create_task (item, text)
    {
        // Create a new task to add in the todolist
        // and displays it while updating the counters
        // of our widget.

        // Don't add empty task
        if (text == '' || text == '\n')
            return;

        // New task object
        let task = {name: text};

        let id = this.tasks.push(task) - 1;
        this._add_task(id);
        this._set_text();

        debug("Emit signals");
        this.emit('task_count_changed', -1);
        this._dump();
    }
    _remove_task  (item, task)
    {
        task = JSON.parse(task)
        debug(task);
        // Remove task from the section
        let id = this.section.tasks.indexOf(task);
        this.section.tasks.splice(id, 1);
        this.n_tasks --;

        // If there is no more tasks, show the delete button
        if(this.n_tasks == 0)
            this.delete_btn.show();

        // Set section title
        this._set_text();
        this.emit('task_count_changed', 1);
        this._dump();

    }
    _rename ()
    {
        let name = this._label.get_text().replace(/ +\([0-9]+\)$/, "")
        // No change needed
        if(name == this.name || name.length == 0)
            return;

        // Update
        this.section.name = name;
        this.name = name;
        this._set_text();
        this._dump();
    }
    _clear ()
    {
        let item = null;
        let items = this.menu_item.menu._getMenuItems();
        for (let i=0; i<items.length; i++)
        {
            item = items[i];
            item.destroy();
        }
        this.menu_item.menu.removeAll();

    }
    _supr_call ()
    {
        this.emit('supr_signal', this);
    }
    _set_text (){
        // Set text of the label with the counter of tasks
        this._label.set_text(this.section.name + " (" + this.n_tasks + ")");
    }
    _dump (){
        this.emit("dump_signal", false);
    }
    _disconnect(){
        // Clean up all the connection
        for(var connection of this.connections.reverse()){
            debug("Connection " + connection);
            try{
                connection[0].disconnect(connection[1]);
            }
            catch(error){
                debug(error);
            }
        }
    }
}

// In gnome-shell >= 3.32 this class and several others became GObject
// subclasses. We can account for this change in a backwards-compatible way
// simply by re-wrapping our subclass in `GObject.registerClass()`
SectionItem = GObject.registerClass(
    {
        GTypeName: 'Todolist_SectionItem',
        Extends: GObject.Object,
        Signals: {
            'supr_signal' : {param_types: [GObject.TYPE_OBJECT]},
            'dump_signal' : {param_types: [GObject.TYPE_BOOLEAN]},
            'task_count_changed': {param_types: [GObject.TYPE_INT]}
        }
    },
    SectionItem
);

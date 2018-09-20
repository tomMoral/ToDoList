
const PopupMenu = imports.ui.popupMenu;
const ModalDialog = imports.ui.modalDialog;
const GLib = imports.gi.GLib;
const Gio = imports.gi.Gio;
const Shell = imports.gi.Shell;
const Lang = imports.lang;
const St = imports.gi.St;

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



// TodoList object
function SectionItem(section)
{
    this._init(section);
}

SectionItem.prototype = {
    __proto__ : PopupMenu.PopupSubMenuMenuItem.prototype,
    _init: function(section)
    {
        this.section = section;

        debug("Got section with name: "+ section.name);
        this.id = section.id;
        this.name = section.name;
        this.tasks = section.tasks;

        // Fill section from the associated file
        this.n_tasks = 0;
        this.metaConn = [];
        this.connections = [];


        PopupMenu.PopupSubMenuMenuItem.prototype._init.call(this, this.name);

        // Add an editable label to display the section title
        this._label = new St.Entry({ 
            style_class: 'task-label', 
            text: this.section.name,
            can_focus: true
        });
        // add our label by replacing the default label in PopupSubMenuMenuItem
        this.actor.add_child(this._label);
        this.actor.set_child_above_sibling(this._label, this.label);
        this.actor.remove_actor(this.label);
        this.label.destroy();

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
        this.actor.add_actor(this.delete_btn);
        // Create connection for delete button
        conn = this.delete_btn.connect('clicked', Lang.bind(this, this._supr_call));
        this.connections.push([this.delete_btn, conn]);

        // Draw the section
        this._draw_section();
    },
    destroy: function(){
        // Clean up all the connection
        for(var connection of this.connections.reverse())
            connection[0].disconnect(connection[1]);

        this.connections.length = 0;
        this.disconnectAll();

        // Remove all sub items
        if (this.entry_task != null)
            this.entry_task.destroy();
        this.actor.destroy();

        debug("Section clean-up done")
    },
    _draw_section: function()
    {
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
        this.menu.addMenuItem(entry_task);
    },
    _add_task : function(i)
    {
        // Create a task item and set its callback
        let taskItem = new TaskItem.TaskItem(this.section.tasks[i]);

        // connect the signals to 
        let conn = taskItem.connect('name_changed', Lang.bind(this, this._dump));
        this.connections.push([taskItem, conn])
        conn = taskItem.connect('supr_signal', Lang.bind(this, this._remove_task));
        this.connections.push([taskItem, conn])

        // Add the task to the section
        this.menu.addMenuItem(taskItem, i);
        this.n_tasks ++;

        // If it is the first task added, hide the delete
        // button for the section.
        if(this.n_tasks == 1)
            this.delete_btn.hide();

    },
    _create_task : function(item, text)
    {
        // Create a new task to add in the todolist
        // and displays it while updating the counters
        // of our widget.

        // Don't add empty task
        if (text == '' || text == '\n')
            return;

        // New task object
        task = {name: text}

        id = this.tasks.push(task) - 1;
        this._add_task(id);
        this._set_text();

        debug("Emit signals");
        this.emit('task_count_changed', -1);
        this._dump();
    },
    _remove_task : function (o, task)
    {
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

    },
    _rename : function()
    {
        name = this._label.get_text().replace(/ +\([0-9]+\)$/, "")
        // No change needed
        if(name == this.name || name.length == 0)
            return;

        // Update
        this.section.name = name;
        this.name = name;
        this._set_text();
        this._dump();
    },
    _clear : function()
    {
        let item = null;
        let items = this.menu._getMenuItems();
        for (let i=0; i<items.length; i++)
        {
            item = items[i];
            item.disconnectAll();
            item.destroy();
        }
        this.menu.removeAll();

    },
    _supr_call : function()
    {
        this.emit('supr_signal', this);
    },
    _set_text : function(){
        // Set text of the label with the counter of tasks
        this._label.set_text(this.section.name + " (" + this.n_tasks + ")");
    },
    _dump : function(){
        this.emit("dump_signal", false);
    }
}
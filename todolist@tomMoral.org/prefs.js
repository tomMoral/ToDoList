// Authors:
// * Baptiste Saleil http://bsaleil.org/
// * Community: https://github.com/bsaleil/todolist-gnome-shell-extension/network
// With code from: https://github.com/vibou/vibou.gTile
//
// Licence: GPLv2+

const Gio = imports.gi.Gio;
const Gtk = imports.gi.Gtk;
const GObject = imports.gi.GObject;
const Utils = imports.misc.extensionUtils.getCurrentExtension().imports.utils;
const ExtensionUtils = imports.misc.extensionUtils;
const Extension = ExtensionUtils.getCurrentExtension();
const debug = Extension.imports.utils.debug;

const Gettext = imports.gettext;
const _ = Gettext.domain('todolist').gettext;

let name_str = "";
let value_str = "";
let opentodolist_str = "";
let todolistdir_str = "";

function append_hotkey(model, settings, name, pretty_names)
{
    let [key, mods] = Gtk.accelerator_parse(settings.get_strv(name)[0]);
    let row = model.insert(10);
    model.set(row, [0, 1, 2, 3], [name, pretty_names[name], mods, key ]);
}

function init()
{
}


function get_file_choser_dialog(current_dir){
    let file_chooser = new Gtk.FileChooserDialog({
        action: Gtk.FileChooserAction.SELECT_FOLDER,
        create_folders: true,

    });
    file_chooser.set_current_folder(
        Gio.File.new_for_path(current_dir)
    );
    file_chooser.add_button('Ok', Gtk.ResponseType.OK);
    file_chooser.add_button('Cancel', Gtk.ResponseType.CANCEL);
    file_chooser.set_default_response(Gtk.ResponseType.OK);
    return file_chooser;
}

function get_bindings_treeview(model, settings){

    let col_name, col_value, cellrend;
    let treeview = new Gtk.TreeView({
        'model': model,
        'visible': false
    });

    let name_str = _("Name");
    let value_str = _("Value");

    cellrend = new Gtk.CellRendererText();
    col_name = new Gtk.TreeViewColumn(
    {
        'title': name_str,
        'expand': true
    });

    col_name.pack_start(cellrend, true);
    col_name.add_attribute(cellrend, 'text', 1);

    treeview.append_column(col_name);

    cellrend = new Gtk.CellRendererAccel({
        'editable': true,
        'accel-mode': Gtk.CellRendererAccelMode.GTK
    });

    cellrend.connect('accel-edited', function(rend, iter, key, mods) {
        let value = Gtk.accelerator_name(key, mods);

        [succ, iter ] = model.get_iter_from_string(iter);

        if(!succ) {
            debug("Error!")
            throw new Error("Something be broken, yo.");
        }

        let name = model.get_value(iter, 0);

        model.set(iter, [ 2, 3 ], [ mods, key ]);

        debug("Changing value for " + name + ": " + value);

        settings.set_strv(name, [value]);
    });

    col_value = new Gtk.TreeViewColumn({
        'title': value_str
    });

    col_value.pack_end(cellrend, false);
    col_value.add_attribute(cellrend, 'accel-mods', 2);
    col_value.add_attribute(cellrend, 'accel-key', 3);

    treeview.append_column(col_value);

    return treeview;
}

// Build prefs UI
function buildPrefsWidget()
{
    // Read locale files
    let locales = Extension.dir.get_path() + "/locale";
    Gettext.bindtextdomain('todolist', locales);
    opentodolist_str = _("Open todolist");
    todolistdir_str = _("Todolist save directory");

    let pretty_names = {
        'open-todolist': opentodolist_str,
        'todolist-directory': todolistdir_str
    };

    let model = new Gtk.ListStore();

    model.set_column_types
    ([
        GObject.TYPE_STRING,
        GObject.TYPE_STRING,
        GObject.TYPE_INT,
        GObject.TYPE_INT
    ]);

    let settings = Utils.getSettings();

    append_hotkey(
        model, settings, 'open-todolist', pretty_names
    );


    // Create a parent widget that we'll return from this function
    let grid = new Gtk.Grid({
        column_spacing: 36,
        row_spacing: 12,
        visible: true
    });
    let prefsWidget = new Gtk.ScrolledWindow({
        'vexpand': true,
        // 'child': treeview
        'child': grid
    });


    // Add a simple title and add it to the prefsWidget
    let title = new Gtk.Label({
        label: `<b>${Extension.metadata.name} Preferences</b>`,
        halign: Gtk.Align.START,
        use_markup: true,
        visible: true
    });
    grid.attach(title, 0, 0, 2, 1);


    // Create a label & text for `todolist-directory`
    let directoryLabel = new Gtk.Label({
        label: pretty_names['todolist-directory'],
        halign: Gtk.Align.START,
        visible: true
    });
    grid.attach(directoryLabel, 0, 1, 1, 1);

    let current_todo_dir = settings.get_strv('todolist-directory')[0];
    let directoryText = new Gtk.Button({
        label: current_todo_dir,
        halign: Gtk.Align.START,
        visible: true,
        css_classes: ['setting-value'],
    });
    grid.attach(directoryText, 1, 1, 1, 1);


    directoryText.connect('clicked', function(){
        let file_chooser = get_file_choser_dialog(
            current_todo_dir
        );
        file_chooser.show();

        file_chooser.connect('response', function(dialog, response_id){
            file_chooser.close();
            if (response_id == Gtk.ResponseType.OK){
                let folder = file_chooser.get_file();
                folder = folder.get_path();
                directoryText.set_label(folder);
                settings.set_strv('todolist-directory', [folder])
            }
        });
    });

    // Create a label & text for bindings
    let bindings = new Gtk.Label({
        label: "Bindings",
        halign: Gtk.Align.START,
        visible: true
    });
    grid.attach(bindings, 0, 2, 1, 1);
    let bindings_button = new Gtk.Button({
        label: "+",
        vexpand: false,
        halign: Gtk.Align.START,
    });
    grid.attach(bindings_button, 1, 2, 1, 1);
    let treeview = get_bindings_treeview(model, settings);
    grid.attach(treeview, 0, 3, 2, 1);

    bindings_button.connect('clicked', function(){
        let visible = treeview.get_visible();
        treeview.set_visible(!visible);
        bindings_button.set_label(visible?'+':'-')
    });


    return prefsWidget;
}

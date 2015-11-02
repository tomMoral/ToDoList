
# Update locale
echo "Build locale"
cd ./locale
./update.sh
cd ..

# Compile schema
echo "Build schema"
glib-compile-schemas ./schemas/

echo "Create the system ressource"
mkdir -p .config/ToDoList
sudo cp icon/gtk-close.png /usr/share/icons/hicolor/48x48/apps/

echo "Install the extension for the current user"
GITREPO=$(pwd)
cd /home/$USER/.local/share/gnome-shell/extensions
rm todolist@tomMoral.org
ln -s $GITREPO todolist@tomMoral.org
cd $GITREPO

echo "Done. You should restart gnome shell with Alt-F2, r and enable the extension in gnome-tweak-tool"

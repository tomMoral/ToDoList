
# Update locale
echo "Build locale"
cd ./locale
./update.sh
cd ..

# Compile schema
echo "Build schema"
glib-compile-schemas ./schemas/

echo "Install the extension for the current user"
GITREPO=$(pwd)
cd /home/$USER/.local/share/gnome-shell/extensions
rm todolist@tomMoral.org
ln -s $GITREPO todolist@tomMoral.org
cd $GITREPO

echo "Done. You should restart gnome shell with Alt-F2, r and enable the extension in gnome-tweak-tool"

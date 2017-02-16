
# Update locale
echo "Build locale"
cd todolist@tomMoral.org/locale
./update.sh
cd ..

# Compile schema
echo "Build schema"
glib-compile-schemas ./schemas/

echo "Create the extension archive"
zip -r ../todolist@tomMoral.zip .

cd ..

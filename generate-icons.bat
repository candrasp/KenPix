@echo off
echo Generating all icon sizes...
npm run tauri icon app-icon.png
echo.
echo Copying icon to public folder...
copy "src-tauri\icons\icon.png" "public\icon.png"
echo.
echo Done! All icons have been generated.
pause

!macro CUSTOM_INSTALL
  ; Register "Open with .files" context menu for directories
  WriteRegStr HKCU "Software\Classes\Directory\shell\dotfiles" "" "Open with .files"
  WriteRegStr HKCU "Software\Classes\Directory\shell\dotfiles" "Icon" "$INSTDIR\dotfiles.exe"
  WriteRegStr HKCU "Software\Classes\Directory\shell\dotfiles\command" "" '"$INSTDIR\dotfiles.exe" "%1"'

  ; Also register for Directory\Background (right-click in empty space)
  WriteRegStr HKCU "Software\Classes\Directory\Background\shell\dotfiles" "" "Open with .files"
  WriteRegStr HKCU "Software\Classes\Directory\Background\shell\dotfiles" "Icon" "$INSTDIR\dotfiles.exe"
  WriteRegStr HKCU "Software\Classes\Directory\Background\shell\dotfiles\command" "" '"$INSTDIR\dotfiles.exe" "%V"'
!macroend

!macro CUSTOM_UNINSTALL
  ; Remove context menu entries
  DeleteRegKey HKCU "Software\Classes\Directory\shell\dotfiles"
  DeleteRegKey HKCU "Software\Classes\Directory\Background\shell\dotfiles"

  ; If .files was set as default handler, revert
  ReadRegStr $0 HKCU "Software\Classes\Directory\shell" ""
  ${If} $0 == "dotfiles"
    DeleteRegValue HKCU "Software\Classes\Directory\shell" ""
  ${EndIf}
!macroend

#!/bin/bash
# Fix para tecla de interrogacao/contrabarra do Lenovo IdeaPad

echo "=== DIAGNÓSTICO DA TECLA ==="
echo "Primeiro vamos identificar a tecla problemática..."

echo -e "\nPressione a tecla problemática e depois Enter para capturar o keycode:"
echo "Executando: xev | grep -A2 --line-buffered '^KeyRelease' | sed -n '/keycode /p'"

echo -e "\n=== SOLUÇÕES POSSÍVEIS ==="

echo "1. MÉTODO XMODMAP (temporário):"
echo "   # Identifica o keycode da tecla"
echo "   xev"
echo "   # Mapeia o keycode para os símbolos corretos"
echo "   xmodmap -e 'keycode 97 = slash question slash question'"

echo -e "\n2. MÉTODO SETKEYCODES (para console):"
echo "   # Para terminal/console"
echo "   sudo setkeycodes 0x56 97"

echo -e "\n3. MÉTODO UDEV (permanente):"
echo "   # Cria regra udev personalizada"
echo "   sudo nano /etc/udev/hwdb.d/90-custom-keyboard.hwdb"

echo -e "\n4. MÉTODO XKBCOMP (layout personalizado):"
echo "   # Salva layout atual e modifica"
echo "   xkbcomp \$DISPLAY keymap.xkb"

echo -e "\nVamos executar o diagnóstico primeiro..."
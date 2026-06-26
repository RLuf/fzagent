#!/bin/bash
# Solucao especifica para Lenovo IdeaPad - tecla interrogacao/contrabarra

echo "=== FIX LENOVO IDEAPAD - TECLA ?/ ==="

# Metodo 1: xmodmap (mais comum para IdeaPad)
echo "METODO 1: Usando xmodmap"
echo "Comandos:"
echo "  xmodmap -e 'keycode 97 = slash question'"
echo "  # ou se for outro keycode:"
echo "  xmodmap -e 'keycode 94 = slash question'"

echo -e "\nMETODO 2: Para IdeaPad especifico (layout ABNT2)"
echo "Comandos:"
echo "  setxkbmap -model abnt2 -layout br -variant abnt2"
echo "  xmodmap -e 'keycode 97 = slash question slash question'"

echo -e "\nMETODO 3: Fix permanente com autostart"
echo "Cria arquivo ~/.xmodmaprc com:"
echo "  keycode 97 = slash question slash question"
echo "E adiciona ao autostart:"
echo "  xmodmap ~/.xmodmaprc"

echo -e "\nMETODO 4: Verificar keycode atual"
echo "Execute: xev e pressione a tecla para ver o keycode"

echo -e "\n=== APLICAR FIX AUTOMATICAMENTE? ==="
read -p "Quer que eu aplique o fix mais comum agora? (y/n): " resposta

if [[ $resposta =~ ^[Yy]$ ]]; then
    echo "Aplicando fix..."
    xmodmap -e 'keycode 97 = slash question slash question'
    echo "Fix aplicado! Teste a tecla agora."
    echo "Para tornar permanente, execute:"
    echo "echo 'xmodmap -e \"keycode 97 = slash question slash question\"' >> ~/.bashrc"
fi
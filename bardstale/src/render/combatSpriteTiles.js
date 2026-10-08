// Every patch is an 8x8 tile at an integer position in the 3x3 character cell.
// A part may contain several patches: robes span the bottom row, weapons span a column.
function tile(column, row, source) {
  const pixels = source.trim().split(/\s+/);
  if (pixels.length !== 8 || pixels.some((line) => line.length !== 8)) {
    throw new Error(`Sprite tile ${column},${row} must contain eight rows of eight pixels: ${source}`);
  }
  return { column, row, pixels };
}

function recolor(tiles, replacements) {
  return tiles.map((patch) => ({ ...patch, pixels: patch.pixels.map((line) => [...line].map((ink) => replacements[ink] ?? ink).join('')) }));
}

const HEADS = {
  hair: [tile(1, 0, `
    ........ ........ ...HHHH. ..HHHSS. ..HHSSS. ..HHSSS. ...SS... ..KKSK..
  `)],
  bald: [tile(1, 0, `
    ........ ........ ...SSSS. ..SSSSS. ..sSSSS. ..sSSSS. ...SS... ..KKSK..
  `)],
  longHair: [tile(1, 0, `
    ........ ...HHHH. ..HHhSS. ..HHSSS. ..HHSSS. ..HHSSS. ..HHSS.. ..HHKSK.
  `)],
  helmet: [tile(1, 0, `
    ....H... ...HH... ..KMMM.. .KMMmmK. .KMMMMK. ..KKSSS. ...SS... ..KKSK..
  `)],
  hood: [tile(1, 0, `
    ........ ...KK... ..KCcK.. .KCcSSK. .KCCSSS. .KCCSSS. ..KCSK.. ..KKSK..
  `)],
  horned: [tile(1, 0, `
    .M....M. .MK..KM. ..KGGK.. .KLLLSK. .KSSSSS. ..KSSSS. ...SS... ..KKSK..
  `)],
  crown: [tile(1, 0, `
    ........ ..G.G.G. ..GGGGG. ..HHHSS. ..HHSSS. ..HHSSS. ...SS... ..KKSK..
  `)],
  skull: [tile(1, 0, `
    ........ ........ ...MMMM. ..MMMMM. ..MmKKM. ..MMMmM. ...MKM.. ..KKMK..
  `)],
};

const TORSOS = {
  tunic: [tile(1, 1, `
    .CcCcC.. KCCCCc.. KKCCCC.. ..C..cC. .....K.. .KCCCCK. KCCCCCc. KKCcCcK.
  `)],
  chain: [tile(1, 1, `
    .CcCcC.. KCcCcC.. KKcCcC.. ..C..cC. .....K.. .KCCCCK. KCcCcCc. KKCcCcK.
  `)],
  leather: [tile(1, 1, `
    .CcCCC.. KCCcCC.. KKCCcC.. ..C..cC. .....K.. .KCCCCK. KCCCCcc. KKGGKKK.
  `)],
  robe: [tile(1, 1, `
    .CcCCC.. KCCcCC.. KKCCcC.. ..C..cC. .....K.. .KCCCCK. KCCGcCC. KCCcCCK.
  `)],
  ribs: [tile(1, 1, `
    .MMMMM.. K.Mm.M.. KMMMMM.. ..M..mM. .....K.. .KMMMMK. K..MM.m. KKMMMMK.
  `)],
};

const SLEEVES = [
  tile(0, 1, `.......A ......AA .....AAa .....AAa .......a ........ ........ ........`),
  tile(1, 1, `A.....A. ......aA ......aa Aa.SS... aaSSS... ........ ........ ........`),
  tile(2, 1, `........ .SS..... SSS..... ........ ........ ........ ........ ........`),
];
const ARMS = {
  sleeves: SLEEVES,
  bare: recolor(SLEEVES, { A: 'S', a: 's' }),
  gauntlets: recolor(SLEEVES, { A: 'm', a: 'M', S: 'm' }),
  bones: recolor(SLEEVES, { A: 'M', a: 'm', S: 'M' }),
};

const PANTS = [
  tile(0, 2, `.......P ......PP .....KPp ....KKK. ..KKKK.. ..KK.... ..KK.... ........`),
  tile(1, 2, `PPppPPPP pKKKKppP K....Kpp ......KK ......KK ......KK ......KK ........`),
  tile(2, 2, `........ P....... P....... K....... ........ ........ KK...... ........`),
];
const LEGS = {
  pants: PANTS,
  bare: recolor(PANTS, { P: 'S', p: 's' }),
  skirt: [
    tile(0, 2, `.......P ......PP .....PPP ....KKKs ..KKKK.. ..KK.... ..KK.... ........`),
    tile(1, 2, `PPppPPPP PPppPPPP PPPPPPPP KKKKKKKS s....KSS ......KK ......KK ........`),
    tile(2, 2, `........ P....... PP...... KKK..... K....... ........ KK...... ........`),
  ],
  robe: [
    tile(0, 2, `........ .......P ......PP ......PP .....PPP ....PPPP ...PPPPP ..KKKKKK`),
    tile(1, 2, `KPPpPPK. PPPpPPPK PPPpPPPK PPPpPPPp PPPpPPPp PPPpPPPp PPppPPPP KKKKKKKK`),
    tile(2, 2, `........ ........ ........ K....... pK...... PpK..... PPpKK... KKKKK...`),
  ],
  bones: [
    tile(0, 2, `........ .......M ......MM .....Mm. ....MM.. ...MK... ..MMM... ........`),
    tile(1, 2, `MMMMMMMM mKKKKmmM K....Kmm ......MM ......MM ......MM ......MM ........`),
    tile(2, 2, `........ M....... M....... m....... ........ ........ MM...... ........`),
  ],
};

const SWORD_GRIP = tile(2, 1, `.GGGGG.. ..L..... .SS..... ..L..... ..K..... ........ ........ ........`);
const WEAPONS = {
  none: [],
  sword: [
    tile(2, 0, `..K..... .KMK.... .KMK.... .KMK.... .KMK.... .KmK.... .KMK.... .KMK....`),
    SWORD_GRIP,
  ],
  shortSword: [
    tile(2, 0, `........ ........ ........ ..K..... .KMK.... .KMK.... .KmK.... .KMK....`),
    SWORD_GRIP,
  ],
  dagger: [
    tile(2, 0, `........ ........ ........ ........ ........ ..K..... .KMK.... .KMK....`),
    SWORD_GRIP,
  ],
  staff: [
    tile(2, 0, `........ ..MK.... ..MK.... ..MK.... ..LK.... ..LK.... ..LK.... ..LK....`),
    tile(2, 1, `..LK.... ..LK.... .SSK.... ..LK.... ..LK.... ..LK.... ..LK.... ..LK....`),
    tile(2, 2, `..LK.... ..LK.... ..LK.... ..LK.... ..LK.... ..LK.... ..LK.... ........`),
  ],
  axe: [
    tile(2, 0, `........ .K..KK.. .LKMmMK. .LKMMMK. .LKMmMK. .LK.KK.. .LK..... .LK.....`),
    tile(2, 1, `.LK..... .LK..... .SS..... .LK..... .LK..... .LK..... ........ ........`),
  ],
  club: [
    tile(2, 0, `........ .KKK.... KLLgK... KLggK... KLLgK... .KLK.... ..LK.... ..LK....`),
    tile(2, 1, `..LK.... ..LK.... .SS..... ..LK.... ..LK.... ..LK.... ........ ........`),
  ],
  bow: [
    tile(2, 0, `........ ..K..... ..LK.... ..LmK... ..m.LK.. ..m.LK.. ..m..LK. ..m..LK.`),
    tile(2, 1, `..m..LK. ..m..LK. .SSLLLK. ..m..LK. ..m..LK. ..m.LK.. ..m.LK.. ..LmK...`),
    tile(2, 2, `..LK.... ..K..... ........ ........ ........ ........ ........ ........`),
  ],
};

const SHIELDS = {
  none: [],
  round: [tile(0, 1, `...KK... ..KLLK.. .KLLgLK. KLgMgLLK KLLgLLLK KLgLgLLK .KLLgLK. ..KKKK..`)],
  kite: [
    tile(0, 1, `.KKKKKK. .KGGGGK. .KGgGGK. .KGGGGK. .KGGGGK. ..KGGK.. ..KGGK.. ...KK...`),
  ],
  buckler: [tile(0, 1, `........ ........ ..KKKK.. .KMMMMK. .KMmmMK. .KMMMMK. ..KKKK.. ........`)],
};

export const SPRITE_PARTS = Object.freeze({ head: HEADS, torso: TORSOS, arms: ARMS, legs: LEGS, weapon: WEAPONS, shield: SHIELDS });

// Non-humanoid bodies also occupy a 3x3 tile cell and share the same palette system.
export const CREATURE_TILES = Object.freeze({
  serpent: [
    tile(1, 0, `........ ........ ........ ........ ....KKKK ...KAAAA ..KAAAAA ..KAAAAA`),
    tile(2, 0, `........ ........ ........ ........ KK...... AaK..... GAK..... AaK.....`),
    tile(1, 1, `..KAAaaA ...KAAAA ....KAAK ....KAAK ....KAAK ...KAaaK ...KAaaK ..KAAaK.`),
    tile(2, 1, `aaK..... KKKHH... ........ ........ ........ ........ ........ ........`),
    tile(0, 2, `........ .......K ......KA ....KKAA ..KKAAAK .KAAAKK. ..KKKKKK ........`),
    tile(1, 2, `.KAAaK.. KAAaaKKK AAAaaAAA AAaaAAAA KAAAAaaa .KKKKKKK KKKKKKKK ........`),
    tile(2, 2, `........ KK...... AAK..... aaaK.... aaaK.... KKK..... ........ ........`),
  ],
  rats: [
    tile(1, 0, `........ ........ ........ ..S..... .KKKK... KLLLgKK. KLgMgLLK ..KKKKKK`),
    tile(2, 0, `........ ........ ........ ........ ........ ........ ..s..... ss......`),
    tile(0, 1, `........ ........ ..S..... .KKKK... KLLLgKK. KLgMgLLK ..KKKKKK ...K..K.`),
    tile(1, 1, `...K..K. ........ ........ ........ ........ ........ s....... .ss.....`),
    tile(2, 1, `........ ..S..... .KKKK... KLLLgKK. KLgMgLLK ..KKKKKK ...K..K. ........`),
    tile(0, 2, `........ ........ ........ ........ ........ ........ ........ ........`),
    tile(1, 2, `........ ..S..... .KKKK... KLLLgKK. KLgMgLLK ..KKKKKK ...K..K. ........`),
    tile(2, 2, `........ ........ ........ ........ ..s..... ss...... ........ ........`),
  ],
  elemental: [
    tile(1, 0, `........ ....c... .c..cc.. .cc.cc.. .cCccC.. ccCcCCc. cCcCCCcc CCCcCCCC`),
    tile(0, 1, `.......c ......cC .....cCC .....CCC ...c.CCC ..ccCCCC ..cCCCCC ...CCCCC`),
    tile(1, 1, `CCCKCCCK CCCMCCCM CCCCCCCC CCCcCCCC CCCccCCC CCCCCCCC CCCpCCCC CCpppCCC`),
    tile(2, 1, `c...c... Cc.cc... Ccccc... CCcc.... CCCCc... CCCc.... CCc..... Cc......`),
    tile(0, 2, `....CCCC .....CCC ......CC ......Cp .....Cpp ....Cppp ...ppppp ........`),
    tile(1, 2, `CCpppCCC CCCppCCC CCCppCCC CCCppCCC CCppppCC CppppppC pppppppp ........`),
    tile(2, 2, `c....... ........ c....... pc...... ppc..... pppc.... ppppp... ........`),
  ],
});

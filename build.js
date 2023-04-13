import MeCab from "https://deno.land/x/deno_mecab@v1.2.3/mod.ts";

function kanaToHira(str) {
  return str.replace(/[\u30a1-\u30f6]/g, (match) => {
    const chr = match.charCodeAt(0) - 0x60;
    return String.fromCharCode(chr);
  });
}

function getFuriganaHTML(morpheme) {
  let html = "";
  const furiganas = getFuriganas(morpheme);
  if (furiganas) {
    furiganas.forEach((furigana) => {
      if (furigana[1]) {
        html += `<ruby>${furigana[0]}<rt>${furigana[1]}</rt></ruby>`;
      } else {
        html += `<span>${furigana[0]}</span>`;
      }
    });
  } else {
    html += `<span>${morpheme.surface}</span>`;
  }
  return html;
}

function getFuriganas(morpheme) {
  const reading = morpheme.reading;
  if (!reading) return undefined;
  const surface = morpheme.surface;
  const hiraSurface = kanaToHira(surface);
  const hiraReading = kanaToHira(reading);
  if (hiraSurface == hiraReading) return undefined;
  // 楽しい --> ([ぁ-ん+])しい --> (たの)しい --> ["たの"]
  // 行き来 --> ([ぁ-ん+])き([ぁ-ん]+) --> (い)き(き), --> ["い", "き"]
  const searchString = hiraSurface.replaceAll(/[一-龠々ヵヶ]+/g, "([ぁ-ん]+)");
  const furiganaRegexp = new RegExp(searchString);
  const furiganas = hiraReading.match(furiganaRegexp).slice(1);
  const map = new Map();
  const kanjis = surface.match(/([一-龠々ヵヶ]+)/g);
  kanjis.forEach((kanji, i) => {
    map.set(kanji, furiganas[i]);
  });
  const words = surface.split(/([一-龠々ヵヶ]+)/g).filter((s) => s != "");
  const result = words.map((word) => {
    const furigana = map.get(word);
    if (furigana) {
      return [word, furigana];
    } else {
      return [word, undefined];
    }
  });
  return result;
}

function cleanupMorphemes(morphemes) {
  const result = [];
  morphemes.forEach((morpheme) => {
    const newMorpheme = {
      surface: morpheme.surface,
      reading: morpheme.reading,
      feature: morpheme.feature,
      featureDetails: morpheme.featureDetails,
      conjugationForms: morpheme.conjugationForms,
    };
    result.push(newMorpheme);
  });
  return result;
}

function json2html(problems) {
  let html = "<ul>\n";
  problems.forEach((morphemes) => {
    let sentence = "";
    morphemes.forEach((morpheme) => {
      sentence += getFuriganaHTML(morpheme);
    });
    html += `  <li>${sentence}</li>\n`;
  });
  html += "</ul>";
  return html;
}

async function text2json(mecab, path) {
  const result = [];
  const text = Deno.readTextFileSync(path);
  const lines = text.trimEnd().split("\n");
  for (const line of lines) {
    const morphemes = await mecab.parse(line);
    const cleanedMorphemes = cleanupMorphemes(morphemes);
    result.push(cleanedMorphemes);
  }
  return result;
}

function countPP(problems) {
  const result = {};
  problems.forEach((morphemes) => {
    const count = morphemes.length;
    if (count in result) {
      result[count] += 1;
    } else {
      result[count] = 1;
    }
  });
  console.log(result);
}

function countPOS(problems) {
  const result = {};
  problems.forEach((morphemes) => {
    morphemes.forEach((morpheme) => {
      const feature = morpheme.feature;
      if (feature in result) {
        result[feature] += 1;
      } else {
        result[feature] = 1;
      }
    });
  });
  console.log(result);
}

const mecab = new MeCab(["mecab"]);
// const text = "今日は学校から帰ったらすぐプールへ行く必要がある。";
// const morphemes = await mecab.parse(text)
// const html = getFuriganaSentence(morphemes);
const problems = await text2json(mecab, "problems.lst");
countPP(problems);
countPOS(problems);
const html = json2html(problems);
Deno.writeTextFileSync("problems.html", html);
const json = JSON.stringify(problems, null, "\t");
Deno.writeTextFileSync("src/problems.json", json);

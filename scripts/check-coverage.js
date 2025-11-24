/**
 * 教材カバレッジチェックスクリプト
 *
 * 使い方: node scripts/check-coverage.js
 *
 * curriculum.json を読み込み、各学習項目の網羅状況をレポートします。
 */

const fs = require('fs');
const path = require('path');

// curriculum.json を読み込み
const curriculumPath = path.join(__dirname, '..', 'assets', 'curriculum.json');
const data = JSON.parse(fs.readFileSync(curriculumPath, 'utf-8'));

// カリキュラムから全項目をパス形式で抽出
function extractAllTopics(curriculum) {
    const topics = [];

    for (const [grade, areas] of Object.entries(curriculum)) {
        for (const [area, units] of Object.entries(areas)) {
            for (const [unit, items] of Object.entries(units)) {
                for (const item of items) {
                    topics.push({
                        path: `${grade}/${area}/${unit}/${item}`,
                        grade,
                        area,
                        unit,
                        item
                    });
                }
            }
        }
    }

    return topics;
}

// 教材からカバー済み項目を抽出
function extractCoveredTopics(materials) {
    const covered = new Map(); // path -> [教材名]

    for (const [name, material] of Object.entries(materials)) {
        for (const topicPath of material.covers || []) {
            if (!covered.has(topicPath)) {
                covered.set(topicPath, []);
            }
            covered.get(topicPath).push(name);
        }
    }

    return covered;
}

// メイン処理
function main() {
    const allTopics = extractAllTopics(data.curriculum);
    const coveredTopics = extractCoveredTopics(data.materials);

    // 統計情報
    const stats = {
        total: allTopics.length,
        covered: 0,
        uncovered: 0,
        byGrade: {},
        byArea: {}
    };

    const uncoveredList = [];
    const coveredList = [];

    for (const topic of allTopics) {
        const materialNames = coveredTopics.get(topic.path);

        if (materialNames) {
            stats.covered++;
            coveredList.push({ ...topic, materials: materialNames });
        } else {
            stats.uncovered++;
            uncoveredList.push(topic);
        }

        // 学年別統計
        if (!stats.byGrade[topic.grade]) {
            stats.byGrade[topic.grade] = { total: 0, covered: 0 };
        }
        stats.byGrade[topic.grade].total++;
        if (materialNames) stats.byGrade[topic.grade].covered++;

        // 領域別統計
        const areaKey = `${topic.grade}/${topic.area}`;
        if (!stats.byArea[areaKey]) {
            stats.byArea[areaKey] = { total: 0, covered: 0 };
        }
        stats.byArea[areaKey].total++;
        if (materialNames) stats.byArea[areaKey].covered++;
    }

    // レポート出力
    console.log('');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('  📊 教材カバレッジレポート');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('');

    // 全体サマリー
    const coveragePercent = ((stats.covered / stats.total) * 100).toFixed(1);
    console.log(`【全体】 ${stats.covered}/${stats.total} 項目 (${coveragePercent}%)`);
    console.log('');

    // プログレスバー
    const barLength = 40;
    const filledLength = Math.round((stats.covered / stats.total) * barLength);
    const bar = '█'.repeat(filledLength) + '░'.repeat(barLength - filledLength);
    console.log(`  [${bar}] ${coveragePercent}%`);
    console.log('');

    // 学年別
    console.log('───────────────────────────────────────────────────────────');
    console.log('  📚 学年別カバレッジ');
    console.log('───────────────────────────────────────────────────────────');
    for (const [grade, s] of Object.entries(stats.byGrade)) {
        const pct = ((s.covered / s.total) * 100).toFixed(1);
        const miniBar = '█'.repeat(Math.round((s.covered / s.total) * 20)) + '░'.repeat(20 - Math.round((s.covered / s.total) * 20));
        console.log(`  ${grade}: ${s.covered.toString().padStart(2)}/${s.total.toString().padStart(2)} [${miniBar}] ${pct.padStart(5)}%`);
    }
    console.log('');

    // 領域別
    console.log('───────────────────────────────────────────────────────────');
    console.log('  📂 領域別カバレッジ');
    console.log('───────────────────────────────────────────────────────────');
    for (const [areaKey, s] of Object.entries(stats.byArea)) {
        const pct = ((s.covered / s.total) * 100).toFixed(1);
        const icon = s.covered === s.total ? '✅' : s.covered > 0 ? '🔶' : '⬜';
        console.log(`  ${icon} ${areaKey}: ${s.covered}/${s.total} (${pct}%)`);
    }
    console.log('');

    // 未カバー項目
    console.log('───────────────────────────────────────────────────────────');
    console.log('  ❌ 未カバー項目一覧');
    console.log('───────────────────────────────────────────────────────────');
    if (uncoveredList.length === 0) {
        console.log('  🎉 全項目カバー済み！');
    } else {
        let currentGrade = '';
        let currentArea = '';
        for (const topic of uncoveredList) {
            if (topic.grade !== currentGrade) {
                currentGrade = topic.grade;
                console.log('');
                console.log(`  【${currentGrade}】`);
            }
            if (`${topic.grade}/${topic.area}` !== currentArea) {
                currentArea = `${topic.grade}/${topic.area}`;
                console.log(`    ${topic.area}:`);
            }
            console.log(`      - ${topic.unit} / ${topic.item}`);
        }
    }
    console.log('');

    // 教材別カバー数
    console.log('───────────────────────────────────────────────────────────');
    console.log('  📖 教材別カバー項目数');
    console.log('───────────────────────────────────────────────────────────');
    for (const [name, material] of Object.entries(data.materials)) {
        const count = (material.covers || []).length;
        console.log(`  ${name}: ${count} 項目`);
    }
    console.log('');

    console.log('═══════════════════════════════════════════════════════════');
}

main();

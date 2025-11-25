/**
 * 既存ストーリー一覧表示スクリプト
 *
 * 使い方: node scripts/list-stories.js
 *
 * 既存の教材HTMLから実践ストーリーを抽出し、重複チェック用に一覧表示します。
 * 新しい教材を作成する際に参考にしてください。
 */

const fs = require('fs');
const path = require('path');

// 教材ディレクトリ
const docsDir = path.join(__dirname, '..', 'docs');

// ストーリー情報を抽出
function extractStories() {
    const stories = [];
    const files = fs.readdirSync(docsDir).filter(f => f.endsWith('_教材.html'));
    const seenStories = new Set(); // 重複チェック用

    for (const file of files) {
        const filePath = path.join(docsDir, file);
        const content = fs.readFileSync(filePath, 'utf-8');
        const materialName = file.replace('_教材.html', '');

        // <h2>タグからストーリータイトルを抽出（より正確）
        const h2Matches = content.matchAll(/<h2[^>]*>おまけ：(.+?)「(.+?)」<\/h2>/g);

        for (const match of h2Matches) {
            const prefix = match[1]; // "歴史ストーリー", "科学と数学" など
            const storyTitle = match[2];

            // 重複チェック
            const key = `${materialName}:${storyTitle}`;
            if (seenStories.has(key)) continue;
            seenStories.add(key);

            let storyType, subCategory;

            if (prefix.includes('歴史ストーリー')) {
                storyType = '歴史ストーリー';
            } else if (prefix.includes('と数学')) {
                storyType = '他分野応用';
                subCategory = prefix.replace('と数学', '').trim();
            } else if (prefix.includes('実践ストーリー')) {
                storyType = 'フィクション';
            } else {
                // その他のパターン
                storyType = '他分野応用';
                subCategory = prefix.trim();
            }

            // ストーリー本文の一部を抽出（最初の段落）
            const h2Index = content.indexOf(match[0]);
            const afterH2 = content.substring(h2Index + match[0].length, h2Index + 1000);
            const firstPMatch = afterH2.match(/<p>([^<]{30,}?)</);
            const summary = firstPMatch ? firstPMatch[1].substring(0, 80).replace(/\s+/g, ' ') + '...' : '';

            stories.push({
                materialName,
                storyType,
                subCategory,
                storyTitle,
                summary
            });
        }
    }

    return stories;
}

// グループ化と表示
function displayStories(stories) {
    console.log('');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('  📚 既存ストーリー一覧（重複チェック用）');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('');

    // ストーリータイプ別にグループ化
    const grouped = {
        '歴史ストーリー': [],
        '他分野応用': [],
        'フィクション': []
    };

    for (const story of stories) {
        grouped[story.storyType].push(story);
    }

    // 1. 実話ベース・他分野応用ストーリー
    console.log('───────────────────────────────────────────────────────────');
    console.log('  1️⃣  実話ベース・他分野応用ストーリー');
    console.log('───────────────────────────────────────────────────────────');
    console.log('');

    if (grouped['歴史ストーリー'].length > 0) {
        console.log('  【歴史エピソード】');
        for (const story of grouped['歴史ストーリー'].sort((a, b) => a.materialName.localeCompare(b.materialName))) {
            console.log(`    📖 「${story.storyTitle}」`);
            console.log(`       教材: ${story.materialName}`);
            if (story.summary) {
                console.log(`       内容: ${story.summary}`);
            }
            console.log('');
        }
    }

    if (grouped['他分野応用'].length > 0) {
        console.log('  【他分野応用】');
        for (const story of grouped['他分野応用'].sort((a, b) => a.materialName.localeCompare(b.materialName))) {
            const category = story.subCategory ? `${story.subCategory}と数学` : '他分野応用';
            console.log(`    🔗 「${story.storyTitle}」 (${category})`);
            console.log(`       教材: ${story.materialName}`);
            if (story.summary) {
                console.log(`       内容: ${story.summary}`);
            }
            console.log('');
        }
    }

    if (grouped['歴史ストーリー'].length === 0 && grouped['他分野応用'].length === 0) {
        console.log('  （まだありません）');
        console.log('');
    }

    // 2. フィクションストーリー
    console.log('───────────────────────────────────────────────────────────');
    console.log('  2️⃣  フィクションストーリー');
    console.log('───────────────────────────────────────────────────────────');
    console.log('');

    if (grouped['フィクション'].length > 0) {
        for (const story of grouped['フィクション'].sort((a, b) => a.materialName.localeCompare(b.materialName))) {
            console.log(`    📝 「${story.storyTitle}」`);
            console.log(`       教材: ${story.materialName}`);
            if (story.summary) {
                console.log(`       内容: ${story.summary}`);
            }
            console.log('');
        }
    } else {
        console.log('  （まだありません）');
        console.log('');
    }

    // 統計情報
    console.log('───────────────────────────────────────────────────────────');
    console.log('  📊 統計');
    console.log('───────────────────────────────────────────────────────────');
    console.log(`  合計ストーリー数: ${stories.length}`);
    console.log(`    - 歴史エピソード: ${grouped['歴史ストーリー'].length}`);
    console.log(`    - 他分野応用: ${grouped['他分野応用'].length}`);
    console.log(`    - フィクション: ${grouped['フィクション'].length}`);
    console.log('');

    // 使用済みテーマ
    const usedTopics = new Set();
    for (const story of stories) {
        // タイトルからキーワード抽出（簡易版）
        const keywords = story.storyTitle.match(/[ァ-ヶー]+|[ぁ-ん]+|[一-龯]+/g) || [];
        keywords.forEach(k => {
            if (k.length >= 2) usedTopics.add(k);
        });
    }

    console.log('───────────────────────────────────────────────────────────');
    console.log('  🏷️  使用済みキーワード（参考）');
    console.log('───────────────────────────────────────────────────────────');
    console.log(`  ${Array.from(usedTopics).sort().join(', ')}`);
    console.log('');

    console.log('═══════════════════════════════════════════════════════════');
}

// メイン処理
function main() {
    try {
        const stories = extractStories();
        displayStories(stories);
    } catch (error) {
        console.error('エラーが発生しました:', error.message);
        process.exit(1);
    }
}

main();

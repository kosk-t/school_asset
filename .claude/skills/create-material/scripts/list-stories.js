/**
 * 既存ストーリー一覧表示スクリプト
 *
 * 使い方: node scripts/list-stories.js
 *
 * 既存の教材HTMLから実践ストーリーを抽出し、重複チェック用に一覧表示します。
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 教材ディレクトリ（スキルの位置から相対パスで解決）
const projectRoot = path.resolve(__dirname, '..', '..', '..', '..');
const juniorDir = path.join(projectRoot, 'docs', 'junior');
const seniorDir = path.join(projectRoot, 'docs', 'senior');

function extractStories() {
    const stories = [];
    const seenStories = new Set();

    const dirs = [
        { dir: juniorDir, level: 'junior' },
        { dir: seniorDir, level: 'senior' }
    ];

    for (const { dir, level } of dirs) {
        if (!fs.existsSync(dir)) continue;
        const files = fs.readdirSync(dir).filter(f => f.endsWith('_教材.html'));

        for (const file of files) {
            const filePath = path.join(dir, file);
            const content = fs.readFileSync(filePath, 'utf-8');
            const materialName = file.replace('_教材.html', '');

            const h2Matches = content.matchAll(/<h2[^>]*>おまけ：(.+?)「(.+?)」<\/h2>/g);

            for (const match of h2Matches) {
                const prefix = match[1];
                const storyTitle = match[2];
                const key = `${level}/${materialName}:${storyTitle}`;
                if (seenStories.has(key)) continue;
                seenStories.add(key);

                let storyType, subCategory;
                if (prefix.includes('歴史ストーリー')) {
                    storyType = '歴史ストーリー';
                } else if (prefix.includes('と数学') || prefix.includes('雑学') || prefix.includes('パラドックス')) {
                    storyType = '他分野応用';
                    subCategory = prefix.trim();
                } else if (prefix.includes('実践ストーリー')) {
                    storyType = 'フィクション';
                } else {
                    storyType = '他分野応用';
                    subCategory = prefix.trim();
                }

                const h2Index = content.indexOf(match[0]);
                const afterH2 = content.substring(h2Index + match[0].length, h2Index + 1000);
                const firstPMatch = afterH2.match(/<p>([^<]{30,}?)</);
                const summary = firstPMatch ? firstPMatch[1].substring(0, 80).replace(/\s+/g, ' ') + '...' : '';

                stories.push({
                    level,
                    materialName,
                    storyType,
                    subCategory,
                    storyTitle,
                    summary
                });
            }
        }
    }
    return stories;
}

function displayStories(stories) {
    console.log('\n=== 既存ストーリー一覧 ===\n');

    const grouped = { '歴史ストーリー': [], '他分野応用': [], 'フィクション': [] };
    for (const story of stories) {
        grouped[story.storyType].push(story);
    }

    console.log('【歴史・他分野応用】');
    for (const story of [...grouped['歴史ストーリー'], ...grouped['他分野応用']]) {
        console.log(`  ${story.storyTitle} (${story.level}/${story.materialName})`);
    }

    console.log('\n【フィクション】');
    for (const story of grouped['フィクション']) {
        console.log(`  ${story.storyTitle} (${story.level}/${story.materialName})`);
    }

    console.log(`\n合計: ${stories.length} ストーリー`);
}

try {
    const stories = extractStories();
    displayStories(stories);
} catch (error) {
    console.error('エラー:', error.message);
    process.exit(1);
}

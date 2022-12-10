
# 使用说明
- `#card`只能加到header上, 会把一整个header作为答案, 会包括子header;
- 删除: 建议手动删除, 手动删除`#card`、id、anki里的数据; 
- 如果要借助插件删除, 可能出错; 步骤: 
  - 先删除`#card`标签
  - 给`^id``前面增加空格或`-`号

# todo
- header内部可以指定`%%cardend%%`作为结束;
- qxxparser.js里把status改为context对象
context = {
  isEnterCard:false,
  isEnterCodeBlock:false
}

# 零碎记录
mklink /D "D:\obsidian-data\.obsidian\plugins\flashcard-qxx" "%cd%/docs/test-vault/.obsidian/plugins/flashcards-obsidian"
mklink /D "D:\obsidian-data\.obsidian\plugins\flashcard-qxx" "%cd%"


# 正则研究
正则不好处理的: 遇到上级的header要停止; 正则没法逻辑判断;

## 测试的正则
```

\n([#]*)((?:[^\n])+?)(#card(?:[\/-]reverse)?)((?: *#[\w-]+)*) *?\n+((?:\n|.)*?)(\^(\d{13})|(?=\n\1 )|(?=%%cardend%%)|(?=\n#)|(?=\n##)|(?=\n###))


\n([#]*)((?:[^\n])+?)(#card(?:[\/-]reverse)?)((?: *#[\w-]+)*) *?\n+((?:\n|.)*?)(?:\^(\d{13})|(?=\n([#]) )|(?=%%cardend%%))


((?:[^\\n]\\n?)+?)(#flashcard(?:[/-]reverse)?)((?: *#[\\p{Number}\\p{Letter}\\-\\/_]+)*) *?\\n+((?:[^\\n]\\n?)*?(?=\\^\\d{13}|$))(?:\\^(\\d{13}))


( {0,3}[#]*)((?:[^\n]\n?)+?)(#flashcard(?:-reverse)?)((?: *#[\w-]+)*) *?\n+((?:[^\n]\n?)*?(?=\^\d{13}|$))(?:\^(\d{13}))?

```

## 卡片匹配正则的理解
https://regex101.com/r/p3yQwY/2
```js
( {0,3}[#]*) -- #号
((?:[^\n]\n?)+?) -- header内容
(#flashcard(?:-reverse)?) -- card标签
((?: *#[\w-]+)*) -- anki标签
 *?\n+ -- 空格或者空行
((?:[^\n]\n?)*?(?=\^\d{13}|$)) -- 段落内容
(?:\^(\d{13}))?  -- 匹配id

```
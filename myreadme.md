
# 使用说明
- `#card`只能加到header上, 会把一整个header作为答案, 会包括子header;
- 删除: 
  - 先删除`#card`标签
  - 给`^id``前面增加空格或`-`号
# todo
- header里指定`%%cardend%%`作为结束;
# 零碎记录
mklink /D "D:\obsidian-data\.obsidian\plugins\flashcard-qxx" "%cd%/docs/test-vault/.obsidian/plugins/flashcards-obsidian"
mklink /D "D:\obsidian-data\.obsidian\plugins\flashcard-qxx" "%cd%"


# 正则研究
正则不好处理的: 遇到上级的header要停止; 正则没法逻辑判断;

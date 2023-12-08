
# 2023-12-08
[[obsidian flashcards anki#添加卡片cpu飙升、卡死 2023-12-08]]

正则测试参考这个:
https://regex101.com/r/eqnJeW/1



# 验证的md
~~~

```python
this is the block
```

this should not be matched ""

```
here we go again
sdfjlskfj

sadfj
```  

行内 ```yeah```

```js
this.obsidianCodeBlock = /(?:```(?:.*?\n?)+?```)(?:\n|$)/gim;
const codeBlocks = [...file.matchAll(this.regex.obsidianCodeBlock)];
```
~~~
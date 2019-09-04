# babel-plugin-lazy-imports

This plugin finds all imported symbols that are only used in async functions, and moves them into asynchronous `await import()` expressions. The following:

```js
import {foo} from 'foo';
import {bar} from 'bar';

export async function doFoo() {
  foo();
}

export function doBar() {
  bar();
}
```

Will be turned into the following:

```js
import {bar} from 'bar';

export async function doFoo() {
  const {foo} = await import('foo');
  foo();
}

export function doBar() {
  bar();
}
```

## Why?

Using this plugin avoids having to execute all the modules in your application from the beginning. It's particularly useful for CLI tools, as they typically only use a subset of all the possible commands during each invocation.

## License (MIT)

> **Copyright © 2019 Maël Nison**
>
> Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:
>
> The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
>
> THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

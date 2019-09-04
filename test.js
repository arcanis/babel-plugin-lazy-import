import def, {Foo1, Bar1} from 'foobar';
import {Foo2, Bar2} from 'foobar';

export async function hello() {
    return Foo1;
}

export function world() {
    return Foo2;
}

export async function foo() {
    const foo = async () => {
        return def;
    };
}

const {wrapInterop} = require(`@babel/helper-module-transforms`);
const template = require(`@babel/template`).default;
const {builtinModules} = require(`module`);

const BUILTIN_MODULES = new Set(builtinModules);

const FUNCTION_NODES = new Set([
    `ClassMethod`,
    `ObjectMethod`,
    `FunctionDeclaration`,
    `ArrowFunctionExpression`,
]);

const DYNAMIC_IMPORT = template(`const IMPORT_TARGET = await import(IMPORT_SOURCE)`, {
    allowAwaitOutsideFunction: true,
    plugins: [`dynamicImport`],
});

const PROPERTY_ACCESS = template(`PROPERTY_SOURCE.PROPERTY_NAME`);

module.exports = function ({types: t}) {
    function findAsyncPath(path) {
        let candidate = null

        for (let current = path.scope.path; current !== null; current = current.parentPath)
            if (FUNCTION_NODES.has(current.node.type) && current.node.async)
                candidate = current;

        return candidate;
    }

    let programPath;

    return {
        visitor: {
            Program: {
                enter(path) {
                    programPath = path;
                },
            },
            ImportDeclaration: {
                enter(path) {
                    if (BUILTIN_MODULES.has(path.node.source.value))
                        return;

                    const allRemaps = new Map();

                    for (const specifier of path.get(`specifiers`)) {
                        const importedIdentifierName = specifier.node.local.name;
                        const {referencePaths} = path.scope.getBinding(importedIdentifierName);

                        const referencesWithTheirBlocks = referencePaths.map(referencePath => {
                            return [referencePath, findAsyncPath(referencePath)];
                        });

                        // If even one of the references is used in a strictly
                        // synchronous block, there's no point in lazy-loading
                        // the file
                        if (referencesWithTheirBlocks.some(([, asyncPath]) => asyncPath === null))
                            return;

                        for (const [referencePath, asyncPath] of referencesWithTheirBlocks) {
                            let remaps = allRemaps.get(asyncPath);
                            if (typeof remaps === `undefined`)
                                allRemaps.set(asyncPath, remaps = []);

                            remaps.push([specifier, referencePath]);
                        }
                    }

                    if (allRemaps.size === 0)
                        return;

                    for (const [asyncPath, remaps] of allRemaps) {
                        if (asyncPath.node.type === `ArrowFunctionExpression` && asyncPath.node.body.type !== `BlockStatement`)
                            asyncPath.node.body = t.blockStatement([t.returnStatement(asyncPath.node.body)]);

                        const id = path.scope.generateUidIdentifierBasedOnNode(path.node.id);

                        asyncPath.get(`body`).unshiftContainer(`body`, DYNAMIC_IMPORT({
                            IMPORT_TARGET: id,
                            IMPORT_SOURCE: path.node.source,
                        }));

                        for (const [specifierPath, referencePath] of remaps) {
                            let source;

                            switch (specifierPath.node.type) {
                                case `ImportSpecifier`: {
                                    source = PROPERTY_ACCESS({
                                        PROPERTY_SOURCE: id,
                                        PROPERTY_NAME: specifierPath.node.imported || t.identifier(`default`),
                                    });
                                } break;
                                case `ImportDefaultSpecifier`: {
                                    source = wrapInterop(programPath, id, "default");
                                } break;
                                case `ImportNamespaceSpecifier`: {
                                    source = wrapInterop(programPath, id, "namespace");
                                } break;
                                default: {
                                    throw new Error(`Unsupported import specifier type "${specifierPath.node.type}"`);
                                } break;
                            }

                            referencePath.replaceWith(source);
                        }
                    }

                    path.remove();
                },
            },
        },
    };
};

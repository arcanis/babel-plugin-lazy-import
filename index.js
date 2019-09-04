const {declare} = require(`@babel/helper-plugin-utils`);
const pluginTransformParameters = require(`@babel/plugin-transform-parameters`).default;
const {wrapInterop} = require(`@babel/helper-module-transforms`);
const template = require(`@babel/template`).default;

const DYNAMIC_IMPORT = template.expression(`await import(SOURCE)`, {
    allowAwaitOutsideFunction: true,
    plugins: [`dynamicImport`],
});

const CONST_DECLARATION = template.statement(`const NAME = INIT`);
const PROPERTY_ACCESS = template.expression(`SOURCE.NAME`);

module.exports = declare((api, options) => {
    const {types: t} = api;
    const pluginTransformParametersInstance = pluginTransformParameters(api, {});

    function findAsyncPath(path) {
        let candidate = null

        for (let current = path.getFunctionParent(); current !== null; current = current.getFunctionParent()) 
            if (current.node.async)
                candidate = current;

        return candidate;
    }

    function isInParameterList(path) {
        const parentFunction = path.getFunctionParent();

        return !path.isDescendant(parentFunction.get(`body`));
    }

    let programPath;

    return {
        visitor: {
            Program(path) {
                programPath = path;
            },
            ImportDeclaration(path) {
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

                    const idRef = path.scope.generateUidIdentifierBasedOnNode(path.node.id);
                    let downgradeParameters = false;

                    const dynamicImport = DYNAMIC_IMPORT({
                        SOURCE: path.node.source,
                    });

                    for (const [specifierPath, referencePath] of remaps) {
                        if (isInParameterList(referencePath)) {
                            source = dynamicImport;
                            downgradeParameters = true;
                        }

                        let dereference;
                        switch (specifierPath.node.type) {
                            case `ImportSpecifier`: {
                                dereference = PROPERTY_ACCESS({
                                    SOURCE: idRef,
                                    NAME: specifierPath.node.imported,
                                });
                            } break;
                            case `ImportDefaultSpecifier`: {
                                dereference = PROPERTY_ACCESS({
                                    source: wrapInterop(programPath, idRef, "default"),
                                    NAME: t.identifier(`default`),
                                });
                            } break;
                            case `ImportNamespaceSpecifier`: {
                                dereference = wrapInterop(programPath, idRef, "namespace");
                            } break;
                            default: {
                                throw new Error(`Unsupported import specifier type "${specifierPath.node.type}"`);
                            } break;
                        }

                        referencePath.replaceWith(dereference);
                    }

                    if (downgradeParameters) {
                        pluginTransformParametersInstance.visitor.Function(asyncPath);
                    }

                    asyncPath.get(`body`).unshiftContainer(`body`, CONST_DECLARATION({
                        NAME: idRef,
                        INIT: dynamicImport,
                    }));
                }

                path.remove();
            },
        },
    };
});

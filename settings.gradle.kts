pluginManagement {
    repositories {
        mavenLocal()
        gradlePluginPortal()
    }
}

rootProject.name = "life-agent"

val functionCatalogCheckout = file("../function-catalog")
if (functionCatalogCheckout.resolve("settings.gradle.kts").isFile) {
    includeBuild(functionCatalogCheckout)
}

val tavallDiCheckout = file("../tavall-di")
if (tavallDiCheckout.resolve("settings.gradle.kts").isFile) {
    includeBuild(tavallDiCheckout)
}

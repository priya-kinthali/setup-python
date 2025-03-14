import sys
argCount = len(sys.argv) - 1
print(f"argCount: {argCount}")

if argCount == 1:
    expectedVersion = sys.argv[1]
    print(f"expectedVersion: {expectedVersion}")
    versions = len(expectedVersion.split("."))
    print(f"versions: {versions}")
    majorMinor = str(sys.version_info[0]) + '.' + str(sys.version_info[1])
    print(f"majorMinor: {majorMinor}")

    if versions == 2:
        # Test only major and minor version
        if expectedVersion != majorMinor:
            raise Exception("Incorrect major + minor version detected\nExpected: " + expectedVersion + "\nActual: " + majorMinor)
    elif versions == 3:
        # Test major, minor and micro version
        majorMinorMicro = majorMinor + '.' + str(sys.version_info[2])
        print(f"majorMinorMicro: {majorMinorMicro}")
        if expectedVersion != majorMinorMicro:
            raise Exception("Incorrect major + minor + micro version detected\nExpected: " + expectedVersion + "\nActual: " + majorMinorMicro)
    else: 
        raise Exception("Incorrect number of arguments supplied")
    print("Correct version of Python " + expectedVersion + " detected")
else:
    raise Exception("Incorrect number of arguments supplied")
import sys
argCount = len(sys.argv) - 1
print(f"argCount: " +  argCount + " is ")

if argCount == 1:
    expectedVersion = sys.argv[1]
    print(f"expectedVersion: " +  expectedVersion + " is ")
    versions = len(expectedVersion.split("."))
    print("versions: " +  versions + " is ")
    majorMinor = str(sys.version_info[0]) + '.' + str(sys.version_info[1])
    print("majorMinor: " + majorMinor + "is ")

    if versions == 2:
        # Test only major and minor version
        if expectedVersion != majorMinor:
            raise Exception("Incorrect major + minor version detected\nExpected: " + expectedVersion + "\nActual: " + majorMinor)
    elif versions == 3:
        # Test major, minor and micro version
        majorMinorMicro = majorMinor + '.' + str(sys.version_info[2])
        print("majorMinorMicro: " + majorMinorMicro + " is")
        if expectedVersion != majorMinorMicro:
            raise Exception("Incorrect major + minor + micro version detected\nExpected: " + expectedVersion + "\nActual: " + majorMinorMicro)
    else: 
        raise Exception("Incorrect number of arguments supplied")
    print("Correct version of Python " + expectedVersion + " detected")
    print(expectedVersion)
    # print("expectedVersion: " +  expectedVersion + " is ")
    # print("versions: " +  versions + " is ")
    # print("majorMinor: " + majorMinor + "is ")
else:
    raise Exception("Incorrect number of arguments supplied")